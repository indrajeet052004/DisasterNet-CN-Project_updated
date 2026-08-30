import { AlertTriangle, Send, Trash2, Check, X, ShieldAlert, RadioTower, Lock } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import NetworkGraph from './NetworkGraph'
import AudioComponent from './Audio'
import OfflineMap from './OfflineMap'

function App() {
  const [messages, setMessages] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [hiddenMessages, setHiddenMessages] = useState<string[]>([])

  const [confirmDeleteMsgIdx, setConfirmDeleteMsgIdx] = useState<number | null>(null)

  useEffect(()=>{
    const interval = setInterval(()=>{
      fetch('http://localhost:3001/messages')
      .then(res=>res.json())
      .then(data => setMessages(data))
    },2000)
    return ()=> clearInterval(interval)
  },[])

  const sendMessage = async (isSOS = false) => {
    let finalMessage = message;

    if (isSOS) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude.toFixed(5);
            const lng = position.coords.longitude.toFixed(5);
            finalMessage = `[URGENT SOS] IMMEDIATE EVACUATION REQUIRED! | LAT:${lat}, LNG:${lng}`;
            await dispatchToBackend(finalMessage, true);
          },
          async () => {
            finalMessage = `[URGENT SOS] I need help! (GPS Unavailable)`;
            await dispatchToBackend(finalMessage, true);
          }
        );
        return; 
      }
    }

    if (finalMessage.trim() === '') return
    await dispatchToBackend(finalMessage, isSOS);
  }

  const dispatchToBackend = async (msgText: string, isSOS: boolean) => {
    await fetch('http://localhost:3001/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({message: msgText, isSOS: isSOS}),
    })
    setMessage('')
  }

  // FIX: Convert Local Blob Audio to Base64 String for Mesh Network Transfer
  const handleAudioRecord = async (audioUrl: string) => {
    if (audioUrl.startsWith('blob:')) {
      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string; 
          // Result looks like "data:audio/webm;base64,GkXfow..."
          await dispatchToBackend(base64Audio, false);
        };
      } catch (error) {
        console.error("Failed to convert audio for mesh transport:", error);
      }
    } else {
      await dispatchToBackend(audioUrl, false);
    }
  }

  const deleteMessage = (msgText: string) => {
    setHiddenMessages(prev => [...prev, msgText])
    setConfirmDeleteMsgIdx(null)
  }
  
  return (
    <div className='min-h-screen w-full flex flex-col justify-center items-center bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] py-6'>

      {/* Glassmorphism Main Container */}
      <div className='flex flex-col h-[85vh] w-[95vw] lg:w-[75vw] xl:w-[65vw] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl'>

          {/* Tactical Header */}
          <div className='flex h-[12%] min-h-[70px] bg-red-900/80 border-b border-red-500/30 px-6 items-center justify-between'>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <AlertTriangle className="text-red-400 w-10 h-10 animate-pulse" />
                  <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 animate-pulse"></div>
                </div>
                <div>
                  <h1 className='text-2xl font-black text-white tracking-widest font-mono uppercase'>DisasterNet</h1>
                  <p className='text-xs text-red-200/70 font-mono uppercase tracking-widest'>Offline Mesh Command Center</p>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                 <p className="text-xs font-mono text-gray-400">VIT CHENNAI NODE</p>
                 <p className="text-[10px] font-mono text-gray-500 mt-1">LAT: 12.8406 | LNG: 80.1534</p>
              </div>
          </div>

          {/* Web of Trust & Network Telemetry Bar */}
          <div className="bg-black/60 border-b border-white/5 px-6 py-2.5 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <div className="flex space-x-6">
              <span className="flex items-center text-emerald-400"><RadioTower className="w-3.5 h-3.5 mr-1.5 animate-pulse"/> mDNS Discovery Active</span>
              <span className="flex items-center text-blue-400"><Lock className="w-3.5 h-3.5 mr-1.5"/> AES-256 GCM E2EE</span>
            </div>
            <span className="flex items-center text-amber-400 mt-2 sm:mt-0"><ShieldAlert className="w-3.5 h-3.5 mr-1.5"/> Ed25519 Web of Trust Enforced</span>
          </div>

          <div className="border-b border-white/5 bg-black/20">
            <NetworkGraph messages={messages} />
          </div>

          {/* Connected Audio Component with Base64 Converter */}
          <AudioComponent onAudioRecorded={handleAudioRecord} />

          {/* Terminal Style Chat Interface */}
          <div className='flex-1 bg-transparent px-6 py-4 overflow-y-auto flex flex-col space-y-5 scrollbar-thin scrollbar-thumb-white/10'>
            {Array.isArray(messages) ? (
              messages
                .filter(msg => !hiddenMessages.includes(msg))
                .map((msg, idx) => {
                  const isReceived = msg.startsWith("Received message");
                  const isConfirming = confirmDeleteMsgIdx === idx;
                  const isUnverified = msg.includes("[UNVERIFIED]"); 
                  const isSOS = msg.includes("[URGENT SOS]");
                  
                  // Detect Base64 Audio Payload
                  const isAudio = msg.includes("data:audio") || msg.includes("data:video");
                  let audioSrc = "";
                  let textPart = msg;

                  if (isAudio) {
                    const dataIndex = msg.indexOf("data:");
                    audioSrc = msg.substring(dataIndex);
                    textPart = msg.substring(0, dataIndex).replace(':', '').trim();
                  }

                  let lat = null, lng = null;
                  if (isSOS && msg.includes("LAT:") && msg.includes("LNG:")) {
                    const match = msg.match(/LAT:([^,]+), LNG:([^]+)/);
                    if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
                  }

                  return (
                    <div key={`msg-${idx}`} className={`flex flex-col w-full ${isReceived ? 'items-start' : 'items-end'}`}>
                      {isUnverified && (
                        <div className="bg-red-950/80 text-red-400 text-[9px] font-mono font-bold px-3 py-1 rounded-t-md flex items-center border border-red-800/50 border-b-0 uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.2)]">
                          <ShieldAlert className="w-3 h-3 mr-1.5" /> Identity Spoofing Detected - Invalid Signature
                        </div>
                      )}

                      <div className={`px-4 py-3 rounded-lg w-fit max-w-[85%] relative group flex flex-col items-start justify-between shadow-xl ${
                        isSOS ? "bg-red-600/90 text-white border border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.4)] self-center w-full max-w-[95%] items-center" 
                        : isUnverified ? "bg-red-950/40 border border-red-800 text-gray-300 rounded-tl-none backdrop-blur-md"
                        : isReceived ? "bg-white/5 text-gray-200 self-start border border-white/10 rounded-tl-sm backdrop-blur-md" 
                        : "bg-emerald-600/20 text-emerald-100 self-end border border-emerald-500/30 rounded-tr-sm backdrop-blur-md"
                      }`}>
                        
                        <div className="w-full text-left">
                          {!isReceived && !isSOS && <span className="text-[9px] text-emerald-400/70 block mb-1.5 font-mono uppercase tracking-wider">✓ Packet Encrypted & Signed</span>}
                          {isReceived && !isUnverified && <span className="text-[9px] text-blue-400/70 block mb-1.5 font-mono uppercase tracking-wider">✓ Ed25519 Signature Verified</span>}
                          
                          {/* Render Player if Audio, Render Text if Normal Message */}
                          {isAudio ? (
                            <div className="flex flex-col mt-1">
                              {textPart && isReceived && <span className="text-[10px] mb-2 text-gray-400 uppercase tracking-wider">{textPart.replace('[UNVERIFIED]', '').replace('Received message at ', '')} transmitted voice data</span>}
                              <audio controls src={audioSrc} className="h-8 w-48 sm:w-64 rounded outline-none" />
                            </div>
                          ) : (
                            <span className={`${isSOS ? 'text-lg font-bold uppercase tracking-wide' : 'text-sm font-light'}`}>
                              {msg.replace('[UNVERIFIED]', '').split('| LAT:')[0]}
                            </span>
                          )}
                          
                          {lat !== null && lng !== null && (
                            <div className="mt-3 w-full flex flex-col items-center border-t border-red-400/30 pt-3">
                               <div className="text-[10px] font-mono bg-red-950/50 px-2 py-1 rounded text-red-200 mb-2 w-full text-center tracking-widest">
                                 TARGET COORDS: {lat}, {lng}
                               </div>
                               <OfflineMap lat={lat} lng={lng} />
                            </div>
                          )}
                        </div>

                        {/* DELETE ACTIONS */}
                        {isConfirming ? (
                          <div className="absolute -top-3 right-0 bg-black border border-red-500/50 px-2 py-1 rounded shadow-xl flex items-center space-x-2 z-10">
                            <button onClick={() => deleteMessage(msg)} className="text-red-400 hover:text-red-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setConfirmDeleteMsgIdx(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteMsgIdx(idx)} className="absolute -top-2 -right-2 bg-black text-white/40 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 border border-white/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            ) : null}
          </div>

          {/* Tactical Input Bar */}
          <div className='h-[12%] min-h-[70px] bg-black/60 flex items-center px-6 border-t border-white/5'>
            <input 
              type='text' 
              placeholder='Enter secure payload...' 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(false)} 
              className='w-full p-3 rounded bg-white/5 text-gray-200 font-mono text-sm outline-none focus:ring-1 focus:ring-white/20 border border-white/5 transition-all placeholder:text-gray-600'
            />
            <button onClick={() => sendMessage(false)} className='ml-4 p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors'>
              <Send className='text-gray-400 w-5 h-5' />
            </button>
            <button onClick={() => sendMessage(true)} className="ml-4 bg-red-600/80 px-6 py-3 rounded text-white font-black tracking-widest uppercase hover:bg-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all border border-red-500/50 text-sm">
              SOS
            </button>
          </div>
      </div>

      {/* MILITARY GRADE FOOTER */}
      <div className="mt-6 flex flex-col items-center px-8 py-2">
        <p className="text-gray-500 font-mono text-xs tracking-widest uppercase">
          System Engineered By <span className="text-gray-300 font-bold ml-1">Indrajeet & Priyanka</span>
        </p>
        <p className="text-gray-600 font-mono text-[9px] tracking-[0.2em] uppercase mt-1">
          Zero-Internet Decentralized Emergency Mesh Network
        </p>
      </div>

    </div>
  )
}

export default App