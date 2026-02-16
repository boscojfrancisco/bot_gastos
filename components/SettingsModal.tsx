
import React, { useState } from 'react';

interface SettingsModalProps {
  currentUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
  instructionsOnly?: boolean;
  isTelegramEnabled?: boolean;
  onToggleTelegram?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  currentUrl, onSave, onClose, instructionsOnly = false, isTelegramEnabled, onToggleTelegram 
}) => {
  const [url, setUrl] = useState(currentUrl);
  const [copied, setCopied] = useState(false);

  const scriptCode = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var payload;
  
  try {
    payload = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Invalid JSON"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = payload.action || 'add'; 
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["F. REGISTRO", "F. GASTO", "HORA REG.", "MONTO ($)", "CATEGORÍA", "DESCRIPCIÓN", "ID"]);
    sheet.getRange("1:1").setBackground("#075e54").setFontColor("white").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  if (action === 'list') {
    var data = sheet.getDataRange().getValues();
    var expenses = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][6]) {
        expenses.push({
          entryDate: data[i][0] + ' ' + data[i][2],
          expenseDate: convertDateToIso(data[i][1]),
          amount: data[i][3],
          category: data[i][4],
          description: data[i][5],
          id: data[i][6]
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "data": expenses}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'delete') {
    var idToDelete = payload.id;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][6] == idToDelete) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({"status": "deleted"}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  if (action === 'bulkAdd' || action === 'add') {
    var expenses = action === 'bulkAdd' ? payload.expenses : [payload];
    var now = new Date();
    var timezone = Session.getScriptTimeZone();
    var fechaRegistro = Utilities.formatDate(now, timezone, "dd/MM/yyyy");
    var horaRegistro = Utilities.formatDate(now, timezone, "HH:mm:ss");

    expenses.forEach(function(item) {
      var fGasto = item.expenseDate.split('-');
      var fechaGastoFormateada = fGasto[2] + '/' + fGasto[1] + '/' + fGasto[0];
      sheet.appendRow([fechaRegistro, fechaGastoFormateada, horaRegistro, item.amount, item.category, item.description, item.id]);
    });
    
    sheet.autoResizeColumns(1, 7);
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "count": expenses.length}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({"status": "unknown_action"}))
    .setMimeType(ContentService.MimeType.JSON);
}

function convertDateToIso(googleDate) {
  if (!googleDate) return "";
  var d = new Date(googleDate);
  var month = '' + (d.getMonth() + 1);
  var day = '' + d.getDate();
  var year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#075e54] p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black italic uppercase">Ajustes GastoBot</h2>
            <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-widest italic">Version Cloud 5.1</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Telegram Instructions */}
          <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#0088cc] p-3 rounded-2xl text-white shadow-md">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-2 1.23-5.63 3.69-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.82-.27-1.47-.41-1.42-.87.03-.24.36-.49 1-.74 3.9-1.69 6.5-2.81 7.81-3.35 3.71-1.53 4.48-1.8 4.98-1.81.11 0 .35.03.5.16.13.1.17.24.18.34.01.07.01.14 0 .22z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-[#004e73] font-black text-xs uppercase tracking-tighter">Telegram Sync</h4>
                  <p className="text-[10px] text-blue-600 font-black uppercase">@gastosallbot</p>
                </div>
              </div>
              <button 
                onClick={onToggleTelegram}
                className={`px-5 py-2.5 rounded-2xl font-black text-[10px] transition-all shadow-md ${isTelegramEnabled ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}
              >
                {isTelegramEnabled ? 'SINCRO ON' : 'SINCRO OFF'}
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] text-blue-800/80 font-bold leading-relaxed">
                1. Buscá <span className="text-[#0088cc] font-black underline cursor-pointer">@gastosallbot</span> en Telegram.<br/>
                2. Activá el botón de arriba y guardá los cambios.<br/>
                3. ¡Listo! Mandale tus gastos por mensaje.<br/>
                <span className="text-[9px] text-blue-500 italic block mt-1 leading-tight">* Mantené esta app abierta en una pestaña para procesar los mensajes.</span>
              </p>
            </div>
          </div>

          {/* Google Sheets Instructions */}
          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
            <h4 className="text-emerald-900 font-black text-[10px] uppercase tracking-[0.2em] mb-4 text-center">Planilla de Google (Cloud Script)</h4>
            <div className="bg-white/60 p-4 rounded-3xl border border-emerald-200/50 mb-5">
               <ol className="text-[11px] text-emerald-900 space-y-2 list-decimal list-inside font-bold">
                <li>Copiá el código de abajo.</li>
                <li>En tu Sheet: <b>Extensiones &gt; Apps Script</b>.</li>
                <li>Pegá el código y dale a <b>Implementar &gt; Nueva implementación</b>.</li>
                <li>Copiá la URL resultante y pegala debajo.</li>
              </ol>
            </div>
            
            <button 
              onClick={copyToClipboard}
              className={`w-full py-4 rounded-2xl font-black text-xs transition-all mb-4 shadow-lg ${
                copied ? 'bg-emerald-600 text-white' : 'bg-[#075e54] text-white hover:bg-emerald-800'
              }`}
            >
              {copied ? '¡CÓDIGO COPIADO!' : 'COPIAR SCRIPT PARA GOOGLE'}
            </button>
            
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">URL Aplicación Web (Google)</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/..."
                className="w-full bg-white border-2 border-emerald-100 rounded-2xl p-4 text-[13px] font-bold text-slate-900 focus:border-[#075e54] outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">VOLVER</button>
          {!instructionsOnly && (
            <button 
              onClick={() => onSave(url)} 
              className="flex-[2.5] py-4 bg-[#075e54] text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl shadow-xl hover:bg-emerald-900 transition-all active:scale-95"
            >
              GUARDAR Y VINCULAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
