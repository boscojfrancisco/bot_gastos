
import React, { useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { encode, decode, decodeAudioData } from '../services/audioUtils';

interface LiveVoiceControlProps {
  onAddExpense: (expense: any) => void;
  addMessage: (text: string, sender: 'user' | 'bot') => void;
  isVisible: boolean;
}

const LiveVoiceControl: React.FC<LiveVoiceControlProps> = ({ onAddExpense, addMessage, isVisible }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.inputTranscription) {
              currentInputRef.current += msg.serverContent.inputTranscription.text;
            }
            if (msg.serverContent?.outputTranscription) {
              currentOutputRef.current += msg.serverContent.outputTranscription.text;
            }

            if (msg.serverContent?.turnComplete) {
              if (currentInputRef.current.trim()) {
                addMessage(currentInputRef.current.trim(), 'user');
              }
              if (currentOutputRef.current.trim()) {
                addMessage(currentOutputRef.current.trim(), 'bot');
              }
              currentInputRef.current = '';
              currentOutputRef.current = '';
            }
          },
          onerror: (e) => { console.error(e); stopSession(); },
          onclose: () => { setIsActive(false); setIsConnecting(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `Eres GastoBot Argentina. Tu misión es registrar gastos de casa y ocio. 
          Categorías: Luz, Agua, Internet, Hipoteca, Alquiler, Teléfono, Servicio Doméstico, Ocio, Restaurantes, Transporte, Otros.
          Habla en español de Argentina de forma natural y breve. Confirma siempre el monto y la categoría. Si el monto es bajo (<100) pregunta si es correcto.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  if (!isVisible && !isActive) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
      {isActive && (
        <div className="bg-red-500 text-white px-5 py-2.5 rounded-[1.5rem] text-[10px] font-black shadow-2xl flex items-center gap-2 animate-pulse border-2 border-white/20 uppercase tracking-widest">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          GastoBot Escuchando...
        </div>
      )}
      <button
        onClick={() => isActive ? stopSession() : startSession()}
        disabled={isConnecting}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-90 ${
          isActive 
            ? 'bg-red-600 text-white ring-4 ring-red-100' 
            : 'bg-[#25D366] text-white ring-4 ring-green-100'
        }`}
      >
        {isConnecting ? (
          <div className="w-8 h-8 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
        ) : isActive ? (
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
          </svg>
        )}
      </button>
    </div>
  );
};

export default LiveVoiceControl;
