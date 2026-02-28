
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Expense } from '../types';
import { expenseProcessor } from '../services/expenseProcessor';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles } from 'lucide-react';
import LiveVoiceControl from './LiveVoiceControl';

interface WhatsAppSimulatorProps {
  messages: ChatMessage[];
  addMessage: (text: string, sender: 'user' | 'bot') => void;
  onAddExpense: (expense: any) => void;
  onDeleteExpense: (id: string) => void;
  currentExpenses: Expense[];
  sheetUrl?: string;
  userName: string;
}

const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ 
  messages, addMessage, onAddExpense, onDeleteExpense, currentExpenses, sheetUrl, userName 
}) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isProcessing) return;

    addMessage(text, 'user');
    if (!overrideText) setInput('');
    setIsProcessing(true);
    setProcessingStep('Analizando con IA...');

    try {
      const result = await expenseProcessor.process(text, currentExpenses, userName, sheetUrl);
      
      // Actualizar estado local
      if (result.expensesAdded.length > 0) {
        result.expensesAdded.forEach(e => onAddExpense(e));
      }
      if (result.expensesDeleted.length > 0) {
        result.expensesDeleted.forEach(id => onDeleteExpense(id));
      }

      addMessage(result.botResponse, 'bot');
    } catch (error: any) {
      addMessage(`⚠️ Error: ${error.message || "Problema de conexión."}`, 'bot');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <div className="flex flex-col h-full whatsapp-bg relative overflow-hidden">
      {/* Header Status */}
      <div className="bg-white/80 backdrop-blur-md text-slate-500 text-[9px] py-1.5 px-4 text-center font-bold border-b border-slate-100 uppercase tracking-[0.2em] shadow-sm z-10 flex items-center justify-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${sheetUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
        {sheetUrl ? 'Sincronización en la nube activa' : 'Modo local (Sin respaldo)'}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-[15px] leading-relaxed relative group ${
                msg.sender === 'user' ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap font-medium">
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-0.5" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<b class="font-black text-slate-950">$1</b>') || '&nbsp;' }} />
                  ))}
                </div>
                <div className="text-[9px] text-slate-400 text-right mt-1.5 font-black uppercase tracking-tighter">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/90 backdrop-blur px-4 py-3 rounded-2xl rounded-tl-none shadow-md flex flex-col gap-2 border border-emerald-50 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{processingStep}</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white/90 backdrop-blur-xl p-4 pb-8 border-t border-slate-100 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe un gasto o consulta..."
              className="w-full bg-slate-50 rounded-2xl pl-5 pr-12 py-4 outline-none text-[15px] text-slate-900 font-semibold border-2 border-transparent focus:border-emerald-500/30 focus:bg-white transition-all shadow-inner"
            />
            <button 
              onClick={() => handleSend()} 
              disabled={!input.trim() || isProcessing} 
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-emerald-600 disabled:text-slate-300 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <LiveVoiceControl 
            onTranscript={(text) => handleSend(text)} 
            isProcessing={isProcessing} 
          />
        </div>
        
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => setInput("¿Cuánto gasté hoy?")}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            Gastos de hoy
          </button>
          <button 
            onClick={() => setInput("Reporte de este mes")}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            Mes actual
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;
