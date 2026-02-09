import React, { useState } from 'react';

interface SettingsModalProps {
  currentUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
  instructionsOnly?: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentUrl, onSave, onClose, instructionsOnly = false }) => {
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
      expenses.push({
        entryDate: data[i][0] + ' ' + data[i][2],
        expenseDate: convertDateToIso(data[i][1]),
        amount: data[i][3],
        category: data[i][4],
        description: data[i][5],
        id: data[i][6]
      });
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
        return ContentService.createTextOutput(JSON.stringify({"status": "deleted", "id": idToDelete}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status": "not_found"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var now = new Date();
  var timezone = Session.getScriptTimeZone();
  var fechaRegistro = Utilities.formatDate(now, timezone, "dd/MM/yyyy");
  var horaRegistro = Utilities.formatDate(now, timezone, "HH:mm:ss");
  var fGasto = payload.expenseDate.split('-');
  var fechaGastoFormateada = fGasto[2] + '/' + fGasto[1] + '/' + fGasto[0];
  
  sheet.appendRow([fechaRegistro, fechaGastoFormateada, horaRegistro, payload.amount, payload.category, payload.description, payload.id]);
  sheet.autoResizeColumns(1, 7);
  
  return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
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
            <h2 className="text-xl font-black italic tracking-tighter">CONFIGURACIÓN BASE DE DATOS</h2>
            <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-widest">Sigue estos pasos para conectar tu nube</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {!instructionsOnly && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tu URL Actual de Apps Script</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-[12px] font-bold text-slate-900 focus:border-[#075e54] outline-none transition-all"
              />
            </div>
          )}
          
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-emerald-400 font-black text-[10px] tracking-widest uppercase">CÓDIGO APPS SCRIPT (v4.0)</span>
              <button 
                onClick={copyToClipboard}
                className={`text-[10px] px-4 py-2 rounded-xl font-black transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 shadow-sm'
                }`}
              >
                {copied ? '¡COPIADO!' : 'COPIAR CÓDIGO'}
              </button>
            </div>
            <pre className="text-[10px] leading-relaxed text-emerald-50/70 font-mono overflow-x-auto p-4 bg-black/40 rounded-xl scrollbar-hide border border-white/5">
              {scriptCode}
            </pre>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
            <h4 className="text-blue-900 font-black text-[10px] uppercase tracking-widest mb-4">PASOS DE INSTALACIÓN:</h4>
            <ol className="text-[11px] text-blue-800 space-y-3 list-decimal list-inside font-bold">
              <li>Crea un Google Sheet y ve a <span className="underline">Extensiones → Apps Script</span>.</li>
              <li>Pega el código de arriba borrando todo lo anterior.</li>
              <li>Dale a <span className="bg-blue-100 px-1 rounded">Implementar → Nueva implementación</span>.</li>
              <li>Tipo: <span className="font-black">Aplicación Web</span>.</li>
              <li>Quién tiene acceso: <span className="text-red-600 font-black italic underline uppercase">Cualquiera</span>.</li>
              <li>Copia la <span className="font-black italic underline uppercase">URL de Aplicación Web</span> y pégala aquí.</li>
            </ol>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            CERRAR
          </button>
          {!instructionsOnly && (
            <button 
              onClick={() => onSave(url)}
              className="flex-[2] py-4 bg-[#075e54] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-800 transition-all active:scale-95"
            >
              SINCRONIZAR CAMBIOS
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;