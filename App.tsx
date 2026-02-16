
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Expense, ChatMessage } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import SettingsModal from './components/SettingsModal';
import { sheetsService } from './services/sheetsService';
import { telegramService } from './services/telegramService';
import { processUserMessage } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>(localStorage.getItem('user_name') || '');
  const [tempName, setTempName] = useState('');
  const [tempUrl, setTempUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('chat');
  const [sheetUrl, setSheetUrl] = useState<string>(localStorage.getItem('sheet_url') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(localStorage.getItem('tg_enabled') === 'true');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastUpdateId = useRef<number>(Number(localStorage.getItem('tg_last_id')) || 0);

  useEffect(() => {
    if (sheetUrl && expenses.length === 0) syncFromSheet(sheetUrl);
  }, [sheetUrl]);

  useEffect(() => {
    if (!isTelegramEnabled || !sheetUrl) return;
    let isPolling = true;
    const pollTelegram = async () => {
      while (isPolling) {
        const updates = await telegramService.getUpdates(lastUpdateId.current + 1);
        for (const update of updates) {
          if (update.update_id > lastUpdateId.current) {
            lastUpdateId.current = update.update_id;
            localStorage.setItem('tg_last_id', lastUpdateId.current.toString());
            if (update.message?.text) await handleTelegramMessage(update.message.text, update.message.chat.id, update.message.from.first_name);
          }
        }
        await new Promise(r => setTimeout(r, 3500));
      }
    };
    pollTelegram();
    return () => { isPolling = false; };
  }, [isTelegramEnabled, sheetUrl, expenses]);

  const handleTelegramMessage = async (text: string, chatId: number, senderName: string) => {
    const result = await processUserMessage(text, expenses, senderName);
    if (result.type === 'FUNCTION_CALLS') {
      const expensesToAdd: any[] = [];
      let responses: string[] = [];
      for (const call of result.calls) {
        if (call.name === 'add_expense') {
          let amount = Number(call.args.amount);
          // Aplicar multiplicador x1000 si el monto es entero y menor a 1000
          if (Number.isInteger(amount) && amount < 1000) {
            amount *= 1000;
          }
          const newExp = { ...call.args, amount, id: crypto.randomUUID(), entryDate: new Date().toISOString() };
          expensesToAdd.push(newExp);
          addExpense(newExp);
        } else if (call.name === 'get_expenses_history') {
          const { startDate, endDate } = call.args as any;
          let filtered = [...expenses];
          if (startDate) filtered = filtered.filter(e => e.expenseDate >= startDate);
          if (endDate) filtered = filtered.filter(e => e.expenseDate <= endDate);
          
          if (filtered.length === 0) {
            responses.push("Sin gastos registrados.");
          } else {
            const sorted = filtered.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
            const total = sorted.reduce((acc, curr) => acc + Number(curr.amount), 0);
            let report = sorted.map(e => {
              const d = new Date(e.expenseDate + 'T00:00:00');
              return `• ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} - ${e.description}: **$${e.amount.toLocaleString()}**`;
            }).join('\n');
            report += `\n\n💰 **TOTAL: $${total.toLocaleString()}**`;
            responses.push(report);
          }
        } else if (call.name === 'delete_expense') {
            const query = (call.args.searchQuery as string).toLowerCase();
            const toDelete = expenses.find(e => e.description.toLowerCase().includes(query) || e.amount.toString() === query);
            if (toDelete) {
              try {
                await sheetsService.deleteExpense(sheetUrl, toDelete.id);
                deleteExpenseState(toDelete.id);
                responses.push(`🗑️ Borré: **${toDelete.description}** ($${toDelete.amount.toLocaleString()}).`);
              } catch (err: any) {
                responses.push(`Error al borrar en la planilla: ${err.message}`);
              }
            } else {
              responses.push(`No encontré nada con "${query}".`);
            }
          }
      }
      if (expensesToAdd.length > 0) {
        try {
          await sheetsService.bulkAddExpenses(sheetUrl, expensesToAdd);
          const total = expensesToAdd.reduce((s, e) => s + Number(e.amount), 0);
          responses.push(`✅ Registrado: *$${total.toLocaleString()}*`);
        } catch (err: any) {
          responses.push(`Error al guardar en la planilla: ${err.message}`);
        }
      }
      await telegramService.sendMessage(chatId, responses.join('\n\n'));
    } else {
      await telegramService.sendMessage(chatId, result.text);
    }
  };

  const syncFromSheet = async (url: string) => {
    setIsLoading(true);
    try {
      const data = await sheetsService.fetchExpenses(url);
      setExpenses(data);
      if (userName && messages.length === 0) {
        setMessages([{ id: '1', text: `¡Hola ${userName}! 👋 Recuperé ${data.length} gastos de tu planilla.`, sender: 'bot', timestamp: new Date() }]);
      }
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleInitialSetup = async () => {
    if (!tempUrl.trim()) { setError('La URL es obligatoria.'); return; }
    setIsLoading(true);
    try {
      const data = await sheetsService.fetchExpenses(tempUrl);
      localStorage.setItem('user_name', tempName || 'Usuario');
      localStorage.setItem('sheet_url', tempUrl);
      setUserName(tempName || 'Usuario');
      setSheetUrl(tempUrl);
      setExpenses(data);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const addExpense = useCallback((data: any) => setExpenses(prev => [{ ...data, id: data.id || crypto.randomUUID() }, ...prev]), []);
  const deleteExpenseState = useCallback((id: string) => setExpenses(prev => prev.filter(e => e.id !== id)), []);
  
  const handleDeleteExpense = useCallback(async (id: string) => {
    const gasto = expenses.find(e => e.id === id);
    if (gasto && window.confirm(`¿Borrar "${gasto.description}"?`)) {
      try {
        deleteExpenseState(id);
        if (sheetUrl) await sheetsService.deleteExpense(sheetUrl, id);
      } catch (err: any) {
        alert(`Error al borrar el gasto: ${err.message}`);
      }
    }
  }, [expenses, sheetUrl, deleteExpenseState]);

  const addMessage = useCallback((text: string, sender: 'user' | 'bot') => setMessages(prev => [...prev, { id: crypto.randomUUID(), text, sender, timestamp: new Date() }]), []);
  
  const toggleTelegram = () => {
    const newVal = !isTelegramEnabled;
    setIsTelegramEnabled(newVal);
    localStorage.setItem('tg_enabled', newVal.toString());
  };

  if (!userName || !sheetUrl) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#075e54] p-6 text-center relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]"></div>
        
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border-4 border-emerald-500/10 z-10 relative">
          <div className="text-5xl mb-4">🇦🇷</div>
          <h1 className="text-2xl font-black text-gray-800 mb-1 tracking-tighter uppercase">GastoBot Setup</h1>
          <p className="text-xs text-gray-400 font-bold mb-6">Tu contador personal con IA</p>
          
          <div className="space-y-4">
            <input type="text" placeholder="Tu Nombre" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-[#075e54] transition-all"/>
            <input type="text" placeholder="URL Apps Script" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#075e54] transition-all"/>
            
            {error && <p className="text-red-500 text-[10px] font-black">{error}</p>}
            
            <button onClick={handleInitialSetup} disabled={isLoading} className="w-full bg-[#075e54] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
              {isLoading ? 'Conectando...' : 'Vincular Cuenta'}
            </button>

            <div className="pt-4 border-t border-slate-100">
               <button 
                 onClick={() => setIsSettingsOpen(true)}
                 className="flex items-center justify-center gap-2 w-full py-2 text-emerald-600 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-50 rounded-xl transition-all"
               >
                 <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                 ¿Cómo obtengo la URL?
               </button>
            </div>
          </div>
        </div>
        {/* Asegurarse de que el modal de ajustes solo se renderice si está abierto y en modo instrucciones */}
        {isSettingsOpen && ( 
          <SettingsModal 
            currentUrl={tempUrl} 
            onSave={(u) => { 
              setTempUrl(u); 
              setSheetUrl(u);
              setIsSettingsOpen(false); 
            }} 
            onClose={() => setIsSettingsOpen(false)}
            instructionsOnly={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl relative overflow-hidden border-x border-slate-100">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        isSinking={true} 
        isTelegramActive={isTelegramEnabled}
      />
      <main className="flex-1 overflow-hidden relative bg-gray-50">
        {activeTab === 'dashboard' ? (
          <Dashboard expenses={expenses} onDelete={handleDeleteExpense} />
        ) : (
          <WhatsAppSimulator 
            messages={messages} 
            addMessage={addMessage} 
            onAddExpense={addExpense} 
            onDeleteExpense={deleteExpenseState} 
            currentExpenses={expenses} 
            sheetUrl={sheetUrl} 
            userName={userName}
          />
        )}
      </main>
      {isSettingsOpen && (
        <SettingsModal 
          currentUrl={sheetUrl} 
          onSave={(u) => { 
            setSheetUrl(u); 
            localStorage.setItem('sheet_url', u); 
            setIsSettingsOpen(false); 
          }} 
          onClose={() => setIsSettingsOpen(false)} 
          isTelegramEnabled={isTelegramEnabled} 
          onToggleTelegram={toggleTelegram}
        />
      )}
    </div>
  );
};

// Fix: Changed to a named export to resolve "Module has no default export" error.
export { App };