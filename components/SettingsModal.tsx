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
  
  // Asegurar encabezados si está vacía
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
        return ContentService.createTextOutput(JSON.stringify({"status": "deleted", "id": idToDelete}))
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
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Configuración de Nube</h2>
            <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-widest">Sincronización Avanzada v5.0</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
            <h4 className="text-emerald-900 font-black text-[10px] uppercase tracking-widest mb-4">INSTRUCCIONES DE ACTUALIZACIÓN:</h4>
            <p className="text-[11px] text-emerald-800 mb-4 font-medium">Es necesario actualizar el script en tu Google Sheet para soportar registros múltiples y reportes de fecha.</p>
            <ol className="text-[11px] text-emerald-800 space-y-3 list-decimal list-inside font-bold">
              <li>Copia el nuevo código debajo.</li>
              <li>En el editor de Apps Script, borra el código viejo y pega este nuevo.</li>
              <li>Pulsa **Implementar &gt; Nueva implementación**.</li>
              <li>Asegúrate de configurar el acceso como **"Cualquiera"**.</li>
            </ol>
          </div>

          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-emerald-400 font-black text-[10px] tracking-widest uppercase">CÓDIGO APPS SCRIPT (v5.0)</span>
              <button 
                onClick={copyToClipboard}
                className={`text-[10px] px-4 py-2 rounded-xl font-black transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 shadow-sm'
                }`}
              >
                {copied ? '¡COPIADO!' : 'COPIAR CÓDIGO'}
              </button>
            </div>
            <pre className="text-[10px] leading-relaxed text-emerald-50/70 font-mono overflow-x-auto p-4 bg-black/40 rounded-xl scrollbar-hide border border-white/5 h-48">
              {scriptCode}
            </pre>
          </div>

          {!instructionsOnly && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">URL de Aplicación Web</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-[12px] font-bold text-slate-900 focus:border-[#075e54] outline-none"
              />
            </div>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">CERRAR</button>
          {!instructionsOnly && (
            <button onClick={() => onSave(url)} className="flex-[2] py-4 bg-[#075e54] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-800 transition-all active:scale-95">
              GUARDAR CAMBIOS
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;