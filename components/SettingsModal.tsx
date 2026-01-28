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
  var payload;
  
  try {
    payload = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Invalid JSON"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = payload.action || 'add'; 
  
  // Configuración de encabezados si está vacía
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["F. REGISTRO", "F. GASTO", "HORA REG.", "MONTO ($)", "CATEGORÍA", "DESCRIPCIÓN", "ID"]);
    sheet.getRange("1:1").setBackground("#075e54").setFontColor("white").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  // ACCIÓN: LISTAR GASTOS
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

  // ACCIÓN: BORRAR GASTO
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

  // ACCIÓN: AGREGAR GASTO
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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#075e54] p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black">Sincronización Total</h2>
            <p className="text-emerald-100/70 text-xs">Tu Google Sheet es ahora tu base de datos central</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">URL Web App (Base de Datos)</label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pega la URL de Apps Script aquí..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 focus:border-[#075e54] focus:ring-0 outline-none transition-all placeholder-slate-300"
            />
          </div>
          
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-emerald-400 font-bold text-[10px] tracking-widest">SISTEMA V3.0 (OBLIGATORIO)</span>
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
            <p className="text-[10px] text-yellow-400 mt-2 font-bold bg-yellow-900/20 p-2 rounded">
              ⚠️ NUEVO: Este script permite recuperar tu historial al cambiar de dispositivo. Actualizalo en Apps Script.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-blue-900 font-black text-[10px] uppercase tracking-widest mb-3">Requisitos:</h4>
            <ol className="text-[11px] text-blue-800 space-y-2 list-decimal list-inside font-medium">
              <li>Reemplaza el código anterior en Apps Script.</li>
              <li>Implementar → Gestionar implementaciones.</li>
              <li>Edita la implementación actual → Nueva Versión.</li>
              <li>Asegura que dice: "Quién tiene acceso: Cualquiera".</li>
            </ol>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-slate-400 font-bold text-sm"
          >
            CANCELAR
          </button>
          <button 
            onClick={() => onSave(url)}
            className="flex-2 px-8 py-3 bg-[#075e54] text-white font-black text-sm rounded-xl shadow-lg hover:bg-emerald-800 transition-all active:scale-95"
          >
            SINCRONIZAR Y GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;