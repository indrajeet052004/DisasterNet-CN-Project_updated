package p2p

import (
	"os"
	"sync"
)

type MessageStore struct {
	mu       sync.Mutex
	messages []string
	filePath string
}

func NewMessageStore(filePath string) *MessageStore {
	return &MessageStore{
		messages: make([]string, 0),
		filePath: filePath,
	}
}

func (s *MessageStore) Save(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messages = append(s.messages, msg)
	
	// Local disk file mein persist karna (Delay-Tolerant Networking)
	f, err := os.OpenFile(s.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		defer f.Close()
		f.WriteString(msg + "\n")
	}
}

func (s *MessageStore) GetAll() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.messages
}