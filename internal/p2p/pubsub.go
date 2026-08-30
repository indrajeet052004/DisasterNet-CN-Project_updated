package p2p

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"fmt"

	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/libp2p/go-libp2p/core/peer"
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
	
	// Phase 2: User ki personal security keys
	PubKey  ed25519.PublicKey
	PrivKey ed25519.PrivateKey
}

type ChatMessage struct {
	Message    string
	SenderID   string
	SenderNick string
	IsSOS      bool
	
	// Phase 2: Payload authenticity proof
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

	// Host start hote hi naye Ed25519 keys generate hongi
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
	// Bhejne se pehle message ko apni Private Key se sign karo
	signature := SignData(cr.PrivKey, message)

	m := ChatMessage{
		Message:    message,
		SenderID:   cr.self.String(),
		SenderNick: cr.nick,
		IsSOS:      isSOS,
		Signature:  signature,
		PublicKey:  cr.PubKey, // Public key sath mein bhej rahe hain taaki receiver verify kar sake
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

		// Phase 2: Receive hone par Public Key se signature verify karo
		isValid := VerifyData(cm.PublicKey, cm.Message, cm.Signature)
		if !isValid {
			// Agar hacker ne raste mein text change kiya hai toh Spoof Alert trigger hoga
			cm.Message = fmt.Sprintf("[SPOOF ALERT - UNVERIFIED SENDER] %s", cm.Message)
		}

		cr.Messages <- cm
	}
}