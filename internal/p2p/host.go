package p2p

import (
	"context"
	"fmt"

	"github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p/core/host"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
)

// FIX: Aligned arguments to match main.go (accepting port as a single string)
func CreateHost(port string) (host.Host, *dht.IpfsDHT, error) {
	// Creating context internally since main.go isn't passing it
	ctx := context.Background()

	// 1. Libp2p Host with TCP transport (Changed %d to %s for string port)
	h, err := libp2p.New(
		libp2p.ListenAddrStrings(fmt.Sprintf("/ip4/0.0.0.0/tcp/%s", port)),
	)
	if err != nil {
		return nil, nil, err
	}

	// 2. Phase 3: Kademlia DHT Routing Table Setup
	kademliaDHT, err := dht.New(h, dht.Mode(dht.ModeServer))
	if err != nil {
		return nil, nil, err
	}

	// Bootstrap DHT network
	if err = kademliaDHT.Bootstrap(ctx); err != nil {
		return nil, nil, err
	}

	return h, kademliaDHT, nil
}

func NewPubSub(ctx context.Context, h host.Host) (*pubsub.PubSub, error) {
	// GossipSub router for mesh messaging
	return pubsub.NewGossipSub(ctx, h)
}