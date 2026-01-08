
import React, { useState } from 'react';

interface SettingsModalProps {
  currentUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentUrl, onSave, onClose }) => {
  const [url, setUrl] = useState(currentUrl);
  const [copied, setCopied] = useState(false);

  const scriptCode = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action || 'add'; // 'add' o 'delete'
  
  // Configuración de encabezados si está vacía
  if (sheet.getLastRow() === 0) {
    // Agregamos columna ID al final
    sheet.appendRow(["F. REGISTRO", "F. GASTO", "HORA REG.", "MONTO ($)", "CATEGORÍA", "DESCRIPCIÓN", "ID"]);
    sheet.getRange("1:1").setBackground("#075e54").setFontColor("white").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  if (action === 'delete') {
    var idToDelete = payload.id;
    var data = sheet.getDataRange().getValues();
    // Buscamos en la columna 7 (índice 6) donde está el ID
    for (var i = 1; i < data.length; i++) {
      if (data[i][6] == idToDelete) {
        sheet.deleteRow(i + 1); // +1 porque los arrays son base-0 y rows base-1
        return ContentService.createTextOutput(JSON.stringify({"status": "deleted", "id": idToDelete}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({"status": "not_found"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Lógica por defecto: ADD
  var now = new Date();
  var timezone = Session.getScriptTimeZone();
  var fechaRegistro = Utilities.formatDate(now, timezone, "dd/MM/yyyy");
  var horaRegistro = Utilities.formatDate(now, timezone, "HH:mm:ss");
  
  var fGasto = payload.expenseDate.split('-');
  var fechaGastoFormateada = fGasto[2] + '/' + fGasto[1] + '/' + fGasto[0];
  
  // Guardamos el ID en la columna 7
  sheet.appendRow([fechaRegistro, fechaGastoFormateada, horaRegistro, payload.amount, payload.category, payload.description, payload.id]);
  sheet.autoResizeColumns(1, 7);
  
  return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#075e54] p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black">Ajustes de Sincronización</h2>
            <p className="text-emerald-100/70 text-xs">Conecta con tu Google Sheet</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">URL Web App de Google</label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega aquí la URL de Apps Script..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 focus:border-[#075e54] focus:ring-0 outline-none transition-all placeholder-slate-300"
            />
          </div>
          
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-emerald-400 font-bold text-[10px] tracking-widest">NUEVO SCRIPT (REQ. ACTUALIZAR)</span>
              <button 
                onClick={copyToClipboard}
                className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
                }`}
              >
                {copied ? '¡COPIADO!' : 'COPIAR CÓDIGO'}
              </button>
            </div>
            <pre className="text-[10px] leading-relaxed text-emerald-50/80 font-mono overflow-x-auto p-3 bg-black/40 rounded-lg scrollbar-hide">
              {scriptCode}
            </pre>
            <p className="text-[10px] text-red-400 mt-2 font-bold bg-red-900/20 p-2 rounded">
              ⚠️ IMPORTANTE: Este código ha cambiado para permitir el borrado. Debes actualizarlo en Apps Script para que funcione.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-blue-900 font-black text-[10px] uppercase tracking-widest mb-3">Guía rápida:</h4>
            <ol className="text-[11px] text-blue-800 space-y-2 list-decimal list-inside font-medium">
              <li>Copia el código nuevo de arriba.</li>
              <li>En Google Sheets ve a Extensiones → Apps Script.</li>
              <li>Borra todo y pega el nuevo código.</li>
              <li><strong>IMPORTANTE:</strong> Implementar → Nueva implementación → Crear nueva versión.</li>
            </ol>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-slate-400 font-bold text-sm"
          >
            DESCARTAR
          </button>
          <button 
            onClick={() => onSave(url)}
            className="flex-2 px-8 py-3 bg-[#075e54] text-white font-black text-sm rounded-xl shadow-lg hover:bg-emerald-800 transition-all active:scale-95"
          >
            GUARDAR CONFIGURACIÓN
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
