
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Expense } from '../types';
import { processUserMessage } from '../services/geminiService';
import { sheetsService } from '../services/sheetsService';
import { GoogleGenAI } from "@google/genai";

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
      const result = await processUserMessage(text, currentExpenses, userName);
      
      if (result.type === 'FUNCTION_CALLS') {
        const expensesToAdd: any[] = [];
        let botResponses: string[] = [];

        for (const call of result.calls) {
          const { name, args } = call;

          if (name === 'add_expense') {
            const newExpense = { ...args, id: crypto.randomUUID(), entryDate: new Date().toISOString() };
            expensesToAdd.push(newExpense);
            onAddExpense(newExpense);
          } 
          
          else if (name === 'delete_expense') {
            const query = (args.searchQuery as string).toLowerCase();
            const toDelete = currentExpenses.find(e => e.description.toLowerCase().includes(query) || e.amount.toString() === query);
            if (toDelete) {
              onDeleteExpense(toDelete.id);
              if (sheetUrl) await sheetsService.deleteExpense(sheetUrl, toDelete.id);
              botResponses.push(`🗑️ Borré: **${toDelete.description}** ($${toDelete.amount}).`);
            } else {
              botResponses.push(`No encontré nada con "${query}".`);
            }
          }

          else if (name === 'get_expenses_history') {
            const { startDate, endDate } = args as any;
            let filtered = [...currentExpenses];
            if (startDate) filtered = filtered.filter(e => e.expenseDate >= startDate);
            if (endDate) filtered = filtered.filter(e => e.expenseDate <= endDate);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const summaryResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Analiza estos gastos: ${JSON.stringify(filtered)}. 
              Genera un reporte así:
              1. Lista con bullets (•): "Fecha - Descripción: $Monto" (uno por línea).
              2. Al final: "**TOTAL: $Monto**".
              PROHIBIDO: No saludes, no uses introducciones, ve directo a la lista. Si no hay gastos, di "No hay gastos en este periodo."`,
              config: { systemInstruction: "Contador experto minimalista argentino." }
            });
            botResponses.push(summaryResponse.text || "Sin datos.");
          }
        }

        if (expensesToAdd.length > 0) {
          if (sheetUrl) await sheetsService.bulkAddExpenses(sheetUrl, expensesToAdd);
          const totalBatch = expensesToAdd.reduce((sum, e) => sum + Number(e.amount), 0);
          botResponses.push(`✅ Registré **${expensesToAdd.length}** gastos por **$${totalBatch.toLocaleString()}**.`);
        }

        if (botResponses.length > 0) addMessage(botResponses.join('\n\n'), 'bot');
      } 
      else if (result.type === 'TEXT') {
        addMessage(result.text, 'bot');
      }
    } catch (error) {
      addMessage('Error al procesar, che.', 'bot');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full whatsapp-bg relative">
      <div className="bg-[#e1f3fb] text-[#054664] text-[10px] py-1.5 px-4 text-center font-black border-b border-blue-100 uppercase tracking-widest shadow-sm z-10">
        {sheetUrl ? '☁️ Cloud Sync Active' : '⚠️ Local Mode'}
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
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center gap-2 border border-emerald-100">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Calculando...</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-100"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-md p-3 flex items-center gap-2 border-t border-slate-200">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Hola ${userName}, ¿qué anotamos?`}
          className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 outline-none text-[15px] text-slate-900 font-semibold border border-transparent focus:border-emerald-500 transition-all"
        />
        <button onClick={handleSend} disabled={!input.trim() || isProcessing} className="p-3.5 bg-[#075e54] text-white rounded-full shadow-lg disabled:bg-slate-300 active:scale-90 transition-transform">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;
