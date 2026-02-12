
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
            <h2 className="text-xl font-black italic uppercase">Configuración</h2>
            <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-widest">GastoBot v5.1</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {!instructionsOnly && (
            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-[#0088cc] p-2.5 rounded-2xl text-white shadow-sm">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-2 1.23-5.63 3.69-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.82-.27-1.47-.41-1.42-.87.03-.24.36-.49 1-.74 3.9-1.69 6.5-2.81 7.81-3.35 3.71-1.53 4.48-1.8 4.98-1.81.11 0 .35.03.5.16.13.1.17.24.18.34.01.07.01.14 0 .22z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[#004e73] font-black text-xs uppercase tracking-tight">Telegram Bot</h4>
                    <p className="text-[10px] text-blue-600 font-bold">@gastosallbot</p>
                  </div>
                </div>
                <button 
                  onClick={onToggleTelegram}
                  className={`px-4 py-2 rounded-2xl font-black text-[10px] transition-all shadow-sm ${isTelegramEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                >
                  {isTelegramEnabled ? 'ACTIVO' : 'INACTIVO'}
                </button>
              </div>
              <p className="text-[10px] text-blue-700/80 font-bold uppercase tracking-wider mb-2">Instrucciones:</p>
              <ul className="text-[10px] text-blue-800 space-y-1 font-medium list-disc list-inside">
                <li>Buscá a <b>@gastosallbot</b> en Telegram.</li>
                <li>Escribíle tus gastos (ej: "100 pan y 500 nafta").</li>
                <li>Mantené esta App abierta o en segundo plano para sincronizar.</li>
              </ul>
            </div>
          )}

          <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
            <h4 className="text-emerald-900 font-black text-[10px] uppercase tracking-widest mb-3">Google Sheets Script (v5.1)</h4>
            <div className="bg-white/50 p-4 rounded-2xl border border-emerald-100 mb-4">
               <ol className="text-[11px] text-emerald-800 space-y-2 list-decimal list-inside font-bold">
                <li>Copiá el código de abajo.</li>
                <li>En tu Sheet, ve a <b>Extensiones &gt; Apps Script</b>.</li>
                <li>Pegá el código y dale a <b>Implementar &gt; Nueva implementación</b>.</li>
                <li>Copiá la URL resultante abajo.</li>
              </ol>
            </div>
            
            <button 
              onClick={copyToClipboard}
              className={`w-full py-3 rounded-2xl font-black text-xs transition-all mb-4 ${
                copied ? 'bg-emerald-600 text-white' : 'bg-[#075e54] text-white hover:bg-emerald-800 shadow-lg'
              }`}
            >
              {copied ? '¡CÓDIGO COPIADO!' : 'COPIAR CÓDIGO DEL SCRIPT'}
            </button>
          </div>

          {!instructionsOnly && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase px-1">URL de Aplicación Web (Apps Script)</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-[12px] font-bold text-slate-900 focus:border-[#075e54] outline-none transition-all"
              />
            </div>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">CERRAR</button>
          {!instructionsOnly && (
            <button 
              onClick={() => onSave(url)} 
              className="flex-[2] py-4 bg-[#075e54] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-800 transition-all active:scale-95"
            >
              GUARDAR CAMBIOS
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
