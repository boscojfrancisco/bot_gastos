
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Expense } from '../types';
import { processUserMessage } from '../services/geminiService';
import { sheetsService } from '../services/sheetsService';

interface WhatsAppSimulatorProps {
  messages: ChatMessage[];
  addMessage: (text: string, sender: 'user' | 'bot') => void;
  onAddExpense: (expense: any) => void;
  onDeleteExpense: (id: string) => void;
  currentExpenses: Expense[];
  sheetUrl?: string;
}

const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ 
  messages, addMessage, onAddExpense, onDeleteExpense, currentExpenses, sheetUrl 
}) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    addMessage(text, 'user');
    setInput('');
    setIsProcessing(true);

    try {
      const result = await processUserMessage(text, currentExpenses);
      
      if (result.type === 'ADD_EXPENSE') {
        const data = result.data as any;
        // Generamos el ID aquí para enviarlo IGUAL a React y a Google Sheets
        const newId = crypto.randomUUID();
        const expenseWithId = { ...data, id: newId };
        
        onAddExpense(expenseWithId);
        
        let sync = '';
        if (sheetUrl) {
          sync = '\n\n✅ *Sincronizado con Sheets.*';
          // Enviamos la petición de creación sin esperar bloqueante para mejor UX, o await si prefieres
          sheetsService.addExpense(sheetUrl, expenseWithId).catch(console.error);
        }
        
        addMessage(`¡Listo! Registré $${data.amount} en **${data.description}**.\n📅 Fecha de gasto: ${data.expenseDate} ${sync}`, 'bot');
      } 
      else if (result.type === 'DELETE_EXPENSE') {
        onDeleteExpense(result.id);
        
        let sync = '';
        if (sheetUrl) {
          sync = ' (y de Sheets)';
          await sheetsService.deleteExpense(sheetUrl, result.id);
        }

        addMessage(`🗑️ He borrado el gasto: **${result.description}**${sync}.`, 'bot');
      }
      else if (result.type === 'TEXT') {
        addMessage(result.text, 'bot');
      }
    } catch (error) {
      console.error(error);
      addMessage('Hubo un error al procesar tu mensaje. Intentá de nuevo.', 'bot');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full whatsapp-bg relative">
      <div className="bg-[#e1f3fb] text-[#054664] text-[11px] py-1.5 px-4 text-center font-black border-b border-blue-100 uppercase tracking-tighter shadow-sm z-10">
        {sheetUrl ? '📊 Sincronización con Google Sheets Activa' : '⚠️ Modo Local - Configura en Ajustes ⚙️'}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
              msg.sender === 'user' ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'
            }`}>
              <div className="whitespace-pre-wrap font-medium">
                {msg.text.split('\n').map((line, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<b class="font-black text-slate-950">$1</b>') || '&nbsp;' }} />
                ))}
              </div>
              <div className="text-[10px] text-slate-400 text-right mt-1 font-bold">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600">GastoBot pensando</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-100 p-3 flex items-center gap-2 border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe un gasto (ej: Ayer gasté 500 en café)"
          className="flex-1 bg-white rounded-full px-5 py-3 shadow-inner outline-none text-[16px] text-slate-950 font-semibold border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
        />
        <button 
          onClick={handleSend} 
          disabled={!input.trim() || isProcessing} 
          className="p-3.5 bg-[#075e54] text-white rounded-full shadow-lg disabled:bg-slate-300 active:scale-90 transition-transform flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;
