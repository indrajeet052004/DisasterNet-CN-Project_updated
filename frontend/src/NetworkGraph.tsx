import React, { useState, useEffect } from 'react';
import ReactFlow, { Background, MarkerType } from 'reactflow';
import type { Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';

const NetworkGraph = ({ messages }: { messages: string[] }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    // 1. Center Node (Tera Device)
    const initialNodes: Node[] = [
      {
        id: 'local-node',
        position: { x: 50, y: 110 },
        data: { label: '💻 Local Host (You)' },
        style: { backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', borderRadius: '8px', border: '2px solid #047857', fontSize: '12px', padding: '8px' }
      }
    ];
    const initialEdges: Edge[] = [];

    // 2. Chat messages se active peers dynamically nikalna
    const peers = new Set<string>();
    if (Array.isArray(messages)) {
      messages.forEach(msg => {
        if (msg.includes("from ")) {
          const parts = msg.split("from ");
          if (parts.length > 1) {
            const name = parts[1].split(":")[0].trim();
            if (name !== "Indrajeet") {
              peers.add(name);
            }
          }
        }
      });
    }

    // 3. Sabhi active peers ko clean vertical/grid stack mein lagana
    Array.from(peers).forEach((peer, index) => {
      const peerId = `peer-${index}`;
      
      // X aur Y spacing taaki cut na ho
      const x = 260 + ((index % 2) * 220);
      const y = 20 + (Math.floor(index / 2) * 80);

      initialNodes.push({
        id: peerId,
        position: { x, y },
        data: { label: `📡 ${peer} (Mesh Active)` },
        style: { backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', borderRadius: '8px', border: '2px solid #1d4ed8', fontSize: '12px', padding: '8px' }
      });

      initialEdges.push({
        id: `edge-${index}`,
        source: 'local-node',
        target: peerId,
        animated: true, 
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [messages]);

  return (
    <div className="w-full h-[300px] bg-slate-800 border-b border-slate-900">
      {/* fitView hata diya hai taaki nodes apni jagah par fixed rahein */}
      <ReactFlow nodes={nodes} edges={edges}>
        <Background color="#475569" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default NetworkGraph;