# 🌐 DisasterNet: Decentralized Offline Emergency Communication System

An enterprise-grade, offline-first peer-to-peer (P2P) communication and tactical mesh platform engineered for disaster-prone areas and emergency zones where traditional cellular infrastructure, Wi-Fi routers, and internet connectivity are completely unavailable.

---

## 🚀 Key Features & Upgrades (DisasterNet 2.0)

- **Zero Internet Dependency:** Operates entirely over local Area Networks (WLAN/LAN) and direct radio/P2P topologies without requiring an active internet gateway or central server.
- **Decentralized Multi-Hop Mesh Routing:** Built on top of **libp2p**, **GossipSub**, and **Kademlia DHT**, enabling autonomous node-to-node communication without any Single Point of Failure (SPOF).
- **Automatic Peer Discovery:** Utilizes **mDNS (Multicast DNS)** over UDP for zero-configuration, instant discovery of neighboring survivor nodes.
- **Military-Grade Security & Encryption 🔒:** Implements **AES-256 GCM** End-to-End Encryption to secure payloads before leaving the device.
- **Cryptographic "Web of Trust" (Anti-Spoofing):** Integrates **Ed25519 Digital Signatures**. Unverified or forged sender identities trigger an immediate tactical UI security warning.
- **Offline GIS Mapping & SOS Beacons:** Pre-cached OpenStreetMap (OSM) tile layers for VIT Chennai. Transmitting an SOS embeds real-time HTML5 GPS coordinates (`LAT`, `LNG`) directly onto an offline map.
- **Delay-Tolerant Networking (DTN / Store & Forward):** Automatically buffers outgoing packets into a local queue when peers are unreachable, flushing the backlog the moment a peer re-enters range.
- **P2P Voice "Walkie-Talkie" Mode:** Encodes real-time audio streams into optimized Base64 payloads for push-to-talk voice broadcasting across the mesh network.
- **Tactical Command Center UI:** A high-performance React + TypeScript dashboard featuring glassmorphism, real-time node topology graphs, and audio playback support.
- **Local Data Persistence:** Automatically logs all transactions and encrypted chat history locally (`logs.txt`) as a recovery backup system.

---

## 🛠️ Technology Stack

- **Backend Core:** Go (Golang 1.23), `libp2p`, `go-libp2p-kad-dht`, `mDNS`, REST API HTTP Bridge
- **Security & Cryptography:** AES-256 GCM, Ed25519 Digital Signatures (Web of Trust)
- **Frontend Interface:** React.js, TypeScript, Tailwind CSS, Vite, Leaflet.js (GIS), Lucide React
- **Networking Protocols:** TCP/UDP, Multicast DNS (mDNS), GossipSub (PubSub), Kademlia DHT

---

## 📂 Project Structure

```text
DisasterNet-CN-Project-main/
├── cmd/
│   ├── disasternet/         # Main backend host, HTTP server, and core logic (main.go)
│   └── node/                # Secondary peer initialization for testing (main.go)
├── internal/
│   └── p2p/
│       ├── encrypt.go       # AES-256 GCM encryption/decryption logic
│       ├── host.go          # P2P host configuration, Peer ID & Kademlia DHT setup
│       ├── mdns.go          # Local network peer discovery protocol over UDP
│       ├── pubsub.go        # Chat room topic subscription and GossipSub messaging
│       └── store.go         # Local storage and state management
├── frontend/                # React + Vite user interface dashboard
│   ├── public/tiles/        # Pre-cached OpenStreetMap PNG tiles for offline GIS
│   ├── src/                 # React components (App.tsx, NetworkGraph, OfflineMap, Audio)
│   └── package.json         # Node dependencies
├── logs.txt                 # Local persistence log for system records
└── README.md
## ⚙️ Getting Started & Local Execution (Zero-Error Guide)
Ensure you have Go (v1.20+) and Node.js (v18+) installed on your machine.
```
Step 1: Start the Primary Backend Node (API Bridge)
Open your first terminal window and navigate to the project directory. The --enable-http flag bridges the Go P2P network with the React frontend, and --nick assigns your display name.
```
cd Downloads/DisasterNet-CN-Project-main
go run cmd/disasternet/main.go --port 9000 --enable-http --same_string warlord --nick Indrajeet
```

Step 2: Launch the Frontend Command Center
Open a second terminal window, navigate to the frontend folder, install dependencies, and start the Vite development server:
```
cd Downloads/DisasterNet-CN-Project-main
cd frontend
npm install
npm run dev
```
(Navigate to http://localhost:5173 in your web browser. The UI will instantly synchronize with the backend running on Step 1).

Step 3: Initialize a Peer Node (Simulating Another Survivor)
Open a third terminal window to simulate a secondary survivor joining the local mesh network. We use port 9001 to avoid network collisions and explicitly set the nickname to Priyanka:
```
cd Downloads/DisasterNet-CN-Project-main
go run cmd/disasternet/main.go --port 9001 --same_string warlord --nick Priyanka
```

(Once active,messages and voice payloads transmitted from the React UI will instantly mesh across nodes).

## 💡 How It Works Under the Hood

- **Host Binding & Kademlia DHT**: Each node generates a unique cryptographic Peer ID and initializes a Kademlia Distributed Hash Table (go-libp2p-kad-dht) to handle decentralized peer routing and table maintenance.
- **mDNS Discovery**: Nodes broadcast a shared rendezvous string (warlord) across the local subnet over UDP. Upon matching, a direct secure P2P connection tunnel is established.
- **Web of Trust Verification**: Packets are signed using Ed25519 keypairs. The receiving node checks cryptographic signatures; any anomaly triggers an [UNVERIFIED] security state on the dashboard.
- **DTN Store & Forward Mechanism**: If a peer is disconnected, outgoing payloads are safely buffered into an internal RAM queue (dtnQueue). Upon mDNS re-discovery, a background daemon automatically flushes and synchronizes the backlog.
- **AES-256 Encryption & GossipSub**: Payloads are serialized, encrypted via AES-GCM (encrypt.go), and published across decentralized topic channels using libp2p-pubsub.
- **The API Bridge**: The Go backend exposes a local REST HTTP server (:3001), allowing the React frontend to fetch synchronized message states and dispatch outgoing payloads seamlessly.

---

## 🚀 Future Scope & Scalability

To transition this platform from a local subnet proof-of-concept into an elite, military-grade global disaster recovery grid:

- **Native Mobile Application (.apk / iOS)**: Porting core daemon logic to React Native utilizing the Google Nearby Connections API and CoreBluetooth for true phone-to-phone hardware mesh networking without Wi-Fi routers.
- **LoRa Radio Hardware Integration**: Bridging the Go backend with ESP32 and SX1276 LoRa transceiver modules over serial/UART to scale offline communication range from local subnets to 15–20 kilometers.
- **Battery-Aware Dynamic Graph Routing**: Implementing custom Dijkstra-based routing algorithms where network edge weights factor in device battery percentages to route packets through stable relay nodes.
- **Autonomous Drone Relay Swarms**: Deploying lightweight DisasterNet daemon nodes on autonomous UAV drones to fly over impassable disaster zones, temporarily bridging isolated pockets of survivors into the central mesh network.

---

## 👥 Authors & Developers

Developed at VIT Chennai as an advanced networking architecture demonstration for Computer Networks (CN).

- **Indrajeet Vishwakarma** (Reg: 24BLC1230)
- **Priyanka Jain** (Reg: 24BLC1276)

