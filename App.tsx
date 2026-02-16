
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
          const newExp = { ...call.args, id: crypto.randomUUID(), entryDate: new Date().toISOString() };
          expensesToAdd.push(newExp);
          addExpense(newExp);
        } else if (call.name === 'get_expenses_history') {
          const { startDate, endDate } = call.args as any;
          let filtered = expenses;
          if (startDate) filtered = filtered.filter(e => e.expenseDate >= startDate);
          if (endDate) filtered = filtered.filter(e => e.expenseDate <= endDate);
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const summary = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera reporte de gastos: ${JSON.stringify(filtered)}. 
            Formato: 
            • Fecha - Desc: $Monto (una línea por gasto)
            ...
            **TOTAL: $Monto**
            No digas nada más. Si no hay gastos di "Sin gastos registrados."`,
            config: { systemInstruction: "Contador minimalista." }
          });
          responses.push(summary.text || "Sin datos.");
        }
      }
      if (expensesToAdd.length > 0) {
        await sheetsService.bulkAddExpenses(sheetUrl, expensesToAdd);
        const total = expensesToAdd.reduce((s, e) => s + e.amount, 0);
        responses.push(`✅ Registré **${expensesToAdd.length}** gastos ($${total}).`);
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
        setMessages([{ id: '1', text: `¡Hola ${userName}! 👋 Recuperé ${data.length} gastos.`, sender: 'bot', timestamp: new Date() }]);
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
      deleteExpenseState(id);
      if (sheetUrl) await sheetsService.deleteExpense(sheetUrl, id);
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
      <div className="h-screen flex flex-col items-center justify-center bg-[#075e54] p-6 text-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border-4 border-emerald-500/10">
          <div className="text-5xl mb-4">🇦🇷</div>
          <h1 className="text-2xl font-black text-gray-800 mb-1 tracking-tighter uppercase">GastoBot Setup</h1>
          <div className="space-y-4 mt-6">
            <input type="text" placeholder="Tu Nombre" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold"/>
            <input type="text" placeholder="URL Apps Script" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold"/>
            {error && <p className="text-red-500 text-[10px] font-black">{error}</p>}
            <button onClick={handleInitialSetup} disabled={isLoading} className="w-full bg-[#075e54] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50">
              {isLoading ? 'CONECTANDO...' : 'VINCULAR MI CUENTA'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl relative overflow-hidden">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setIsSettingsOpen(true)} isSinking={true} isTelegramActive={isTelegramEnabled}/>
      <main className="flex-1 overflow-hidden relative bg-gray-50">
        {activeTab === 'dashboard' ? (
          <Dashboard expenses={expenses} onDelete={handleDeleteExpense} />
        ) : (
          <WhatsAppSimulator messages={messages} addMessage={addMessage} onAddExpense={addExpense} onDeleteExpense={deleteExpenseState} currentExpenses={expenses} sheetUrl={sheetUrl} userName={userName}/>
        )}
      </main>
      {isSettingsOpen && (
        <SettingsModal currentUrl={sheetUrl} onSave={(u) => { setSheetUrl(u); localStorage.setItem('sheet_url', u); setIsSettingsOpen(false); }} onClose={() => setIsSettingsOpen(false)} isTelegramEnabled={isTelegramEnabled} onToggleTelegram={toggleTelegram}/>
      )}
    </div>
  );
};

export default App;
