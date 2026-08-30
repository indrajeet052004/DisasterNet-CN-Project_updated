package p2p

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"sync"

	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/libp2p/go-libp2p/core/peer"
)

// Active nicknames ko track karne ke liye global registry
var (
	registryMu     sync.Mutex
	knownNicknames = make(map[string]string) // map[Nick]string(PublicKeyBase64)
)

type ChatRoom struct {
	Messages chan *ChatMessage
	ctx      context.Context
	ps       *pubsub.PubSub
	topic    *pubsub.Topic
	sub      *pubsub.Subscription

	roomName string
	self     peer.ID
	nick     string
	
	PubKey  ed25519.PublicKey
	PrivKey ed25519.PrivateKey
}

type ChatMessage struct {
	Message    string
	SenderID   string
	SenderNick string
	IsSOS      bool
	Signature  string
	PublicKey  []byte
}

const ChatRoomBufSize = 128

func topicName(roomName string) string {
	return "chat-room:" + roomName
}

func JoinChatRoom(ctx context.Context, ps *pubsub.PubSub, selfID peer.ID, nickname string, roomName string) (*ChatRoom, error) {
	topic, err := ps.Join(topicName(roomName))
	if err != nil {
		return nil, err
	}

	sub, err := topic.Subscribe()
	if err != nil {
		return nil, err
	}

	pubKey, privKey, err := GenerateKeys()
	if err != nil {
		return nil, err
	}

	cr := &ChatRoom{
		ctx:      ctx,
		ps:       ps,
		topic:    topic,
		sub:      sub,
		self:     selfID,
		nick:     nickname,
		roomName: roomName,
		Messages: make(chan *ChatMessage, ChatRoomBufSize),
		PubKey:   pubKey,
		PrivKey:  privKey,
	}

	go cr.readLoop()
	return cr, nil
}

func (cr *ChatRoom) Publish(message string, isSOS bool) error {
	signature := SignData(cr.PrivKey, message)

	m := ChatMessage{
		Message:    message,
		SenderID:   cr.self.String(),
		SenderNick: cr.nick,
		IsSOS:      isSOS,
		Signature:  signature,
		PublicKey:  cr.PubKey,
	}
	msgBytes, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return cr.topic.Publish(cr.ctx, msgBytes)
}

func (cr *ChatRoom) readLoop() {
	for {
		msg, err := cr.sub.Next(cr.ctx)
		if err != nil {
			close(cr.Messages)
			return
		}
		if msg.ReceivedFrom == cr.self {
			continue
		}
		cm := new(ChatMessage)
		err = json.Unmarshal(msg.Data, cm)
		if err != nil {
			continue
		}

		isValid := VerifyData(cm.PublicKey, cm.Message, cm.Signature)

		// Duplicate Nickname / Spoof Detection Logic
		pubKeyStr := base64.StdEncoding.EncodeToString(cm.PublicKey)
		
		registryMu.Lock()
		existingKey, exists := knownNicknames[cm.SenderNick]
		if !exists {
			knownNicknames[cm.SenderNick] = pubKeyStr
		} else if existingKey != pubKeyStr {
			// AGAR NICKNAME SAME HAI LEKIN PUBLIC KEY ALAG HAI -> SPOOFED / UNVERIFIED!
			isValid = false
		}
		registryMu.Unlock()

		if !isValid {
			cm.Message = fmt.Sprintf("[UNVERIFIED - IDENTITY SPOOF DETECTED] %s", cm.Message)
		}

		cr.Messages <- cm
	}
}
