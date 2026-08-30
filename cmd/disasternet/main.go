package main

import (
	"DisasterNet/internal/p2p"
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	pubsub "github.com/libp2p/go-libp2p-pubsub"
)

type IncomingMsg struct {
	Message string `json:"message"`
	IsSOS   bool   `json:"isSOS"`
}

var MessageArr []string
var messageMu sync.Mutex

// DTN: Offline Message Queue for Store & Forward
var dtnQueue []IncomingMsg
var dtnMu sync.Mutex

var cr *p2p.ChatRoom

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func StoreMessage(msg string) {
	messageMu.Lock()
	defer messageMu.Unlock()
	MessageArr = append(MessageArr, msg)
}

// DTN: Store message locally if network is offline/disconnected
func StoreOfflinePayload(msg string, isSOS bool) {
	dtnMu.Lock()
	defer dtnMu.Unlock()
	dtnQueue = append(dtnQueue, IncomingMsg{Message: msg, IsSOS: isSOS})
	fmt.Printf("[DTN Store & Forward] Peer offline. Message buffered locally. Queue size: %d\n", len(dtnQueue))
}

// DTN: Flush queued messages once a peer connects via mDNS
func FlushDTNQueue() {
	dtnMu.Lock()
	defer dtnMu.Unlock()

	if len(dtnQueue) == 0 || cr == nil {
		return
	}

	fmt.Printf("[DTN Sync] Peer re-connected! Flushing %d buffered messages...\n", len(dtnQueue))
	for _, item := range dtnQueue {
		err := cr.Publish(item.Message, item.IsSOS)
		if err != nil {
			fmt.Println("[DTN Sync] Failed to sync message, retaining in queue...")
			return
		}
		time.Sleep(200 * time.Millisecond) // Throttle sync packets
	}
	// Clear queue after successful synchronization
	dtnQueue = []IncomingMsg{}
	fmt.Println("[DTN Sync] All buffered offline payloads successfully synchronized!")
}

func GetMessages(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != "GET" {
		http.Error(w, "Only Get Method supported", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(MessageArr)
	if err != nil {
		http.Error(w, "failed to encode messages", http.StatusInternalServerError)
		return
	}
}

func PostMessage(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	if r.Method == http.MethodOptions {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Only POST Method supported", http.StatusBadRequest)
		return
	}

	var msg_post IncomingMsg
	err := json.NewDecoder(r.Body).Decode(&msg_post)
	if err != nil || msg_post.Message == "" {
		http.Error(w, "failed to decode", http.StatusBadRequest)
		return
	}

	// Try publishing to chatroom
	if cr != nil {
		err_pub := cr.Publish(msg_post.Message, msg_post.IsSOS)
		if err_pub != nil {
			// DTN Fallback if publish fails due to no active mesh peers
			StoreOfflinePayload(msg_post.Message, msg_post.IsSOS)
		}
	} else {
		StoreOfflinePayload(msg_post.Message, msg_post.IsSOS)
	}
	
	if msg_post.IsSOS {
		StoreMessage("[URGENT SOS] " + msg_post.Message)
	} else {
		StoreMessage(msg_post.Message)
	}

	w.WriteHeader(http.StatusOK)
}

func main() {
	port := flag.String("port", "", "port")
	nickFlag := flag.String("nick", "", "nickname to use in chat")
	roomFlag := flag.String("room", "chat-room", "name of chat room to join")
	httpServerRun := flag.Bool("enable-http", false, "run http server on this node")
	sameNetworkString := flag.String("same_string", "", "same_string")

	flag.Parse()
	h, _, err1 := p2p.CreateHost(*port)

	if err1 != nil {
		log.Fatal("error creating the host")
	}

	ctx := context.Background()

	ps, err := pubsub.NewGossipSub(ctx, h)
	if err != nil {
		panic(err)
	}
	peerChan := p2p.InitMDNS(h, *sameNetworkString)

	go func() {
		for {
			peer := <-peerChan 
			if peer.ID > h.ID() {
				fmt.Println("Found peer:", peer, " id is greater than us, wait for it to connect to us")
				continue
			}
			fmt.Println("Discovered new peer via mDNS:", peer.ID, peer.Addrs)

			if err := h.Connect(ctx, peer); err != nil {
				fmt.Println("Connection failed:", err)
				continue
			}

			log.Println("Connection to the peer found through MDNS has been established")
			log.Println("Peer Id:", peer.ID, "Peer Addrs: ", peer.Addrs)

			// DTN TRIGGER: Flush buffered offline messages as soon as peer connects
			go FlushDTNQueue()
		}
	}()

	nick := *nickFlag
	if len(nick) == 0 {
		nick = "Indrajeet"
	}

	room := *roomFlag

	cr, err = p2p.JoinChatRoom(ctx, ps, h.ID(), nick, room)
	if err != nil {
		panic(err)
	}

	if *httpServerRun {
		go func() {
			http.HandleFunc("/send", PostMessage)
			http.HandleFunc("/messages", GetMessages)
			err := http.ListenAndServe(":3001", nil)
			if err != nil {
				log.Fatal(err)
			}
		}()
	}

	f, err := os.OpenFile("logs.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("error opening logs.txt")
	}
	
	go func() {
		for msg := range cr.Messages {
			var text string
			if msg.IsSOS {
				text = fmt.Sprintf("Received message at %v from %s: [URGENT SOS] %s\n", time.Now().Format("15:04:05"), msg.SenderNick, msg.Message)
			} else {
				text = fmt.Sprintf("Received message at %v from %s: %s\n", time.Now().Format("15:04:05"), msg.SenderNick, msg.Message)
			}
			StoreMessage(text)
			fmt.Print(text)
			_, err_log := f.WriteString(text)
			if err_log != nil {
				log.Println("error writing logs..")
				continue
			}
		}
	}()

	fmt.Println("Sending test message...")
	reader := bufio.NewReader(os.Stdin)
	
	err = cr.Publish("Hello from "+h.ID().String(), false)
	if err != nil {
		fmt.Println("Error publishing:", err)
	}
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			log.Fatal(err)
		}

		err_pub := cr.Publish(line, false)
		if err_pub != nil {
			StoreOfflinePayload(line, false)
			continue
		}
	}
}