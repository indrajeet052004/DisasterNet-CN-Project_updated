import React, { useState, useRef } from 'react';
import { Mic, MicOff, Radio, Trash2 } from 'lucide-react';

interface AudioProps {
  onAudioRecorded: (audioUrl: string) => void;
}

const AudioComponent: React.FC<AudioProps> = ({ onAudioRecorded }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        onAudioRecorded(audioUrl);

        // Go Backend HTTP bridge par bhejna
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-msg.webm');

        await fetch('http://localhost:3001/audio', {
          method: 'POST',
          body: formData,
        });
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex justify-between items-center text-white">
      <div className="flex items-center space-x-2">
        <Radio className="text-emerald-400 animate-pulse w-4 h-4" />
        <span className="font-semibold text-xs">Walkie-Talkie PTT Mode</span>
      </div>
      <div>
        {isRecording ? (
          <button
            onMouseUp={stopRecording}
            onTouchEnd={stopRecording}
            className="bg-red-600 px-3 py-1 rounded-lg font-bold text-xs flex items-center space-x-1 shadow-[0_0_10px_rgba(220,38,38,0.9)] animate-pulse"
          >
            <MicOff className="w-3.5 h-3.5" />
            <span>RECORDING... (Release)</span>
          </button>
        ) : (
          <button
            onMouseDown={startRecording}
            onTouchStart={startRecording}
            className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg font-bold text-xs flex items-center space-x-1 transition-transform hover:scale-105"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>HOLD TO TALK</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioComponent;