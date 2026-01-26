
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Expense } from "../types";

const CATEGORIES = [
  'Luz', 'Agua', 'Internet', 'Hipoteca', 'Alquiler', 
  'Teléfono', 'Servicio Doméstico', 'Ocio', 'Restaurantes', 
  'Transporte', 'Otros'
];

const addExpenseTool: FunctionDeclaration = {
  name: 'add_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Registra un nuevo gasto con fecha específica.',
    properties: {
      amount: { type: Type.NUMBER, description: 'Monto en pesos argentinos' },
      category: { type: Type.STRING, description: 'Categoría', enum: CATEGORIES },
      description: { type: Type.STRING, description: 'Descripción breve' },
      expenseDate: { type: Type.STRING, description: 'Fecha del gasto en formato YYYY-MM-DD.' },
    },
    required: ['amount', 'category', 'description', 'expenseDate'],
  },
};

const deleteExpenseTool: FunctionDeclaration = {
  name: 'delete_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Elimina un gasto existente.',
    properties: {
      searchQuery: { type: Type.STRING, description: 'Palabra clave' },
    },
    required: ['searchQuery'],
  },
};

const queryExpensesTool: FunctionDeclaration = {
  name: 'get_expenses_history',
  parameters: {
    type: Type.OBJECT,
    description: 'Obtiene el historial para resúmenes.',
    properties: {},
  },
};

export async function processUserMessage(
  text: string, 
  currentExpenses: Expense[],
  userName: string = "Amigo"
) {
  // Fix: Obtained API key exclusively from process.env.API_KEY and assumed it's pre-configured
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(now);

  try {
    // Fix: Initialize GoogleGenAI directly with process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Fix: Use simple string for text contents as per guidelines
      contents: text,
      config: {
        tools: [{ functionDeclarations: [addExpenseTool, deleteExpenseTool, queryExpensesTool] }],
        systemInstruction: `Eres GastoBot Argentina. Usuario: ${userName}. Hoy: ${dayName} ${todayStr}. 
        Misión: Ayudar a registrar gastos. Sé breve y usa emojis.`
      },
    });

    const call = response.candidates?.[0]?.content?.parts.find(p => p.functionCall);
    
    if (call?.functionCall) {
      const { name, args } = call.functionCall;
      if (name === 'add_expense') return { type: 'ADD_EXPENSE', data: args };
      if (name === 'delete_expense') {
        const query = (args.searchQuery as string).toLowerCase();
        const toDelete = currentExpenses.find(e => 
          e.description.toLowerCase().includes(query) || e.amount.toString() === query
        );
        if (toDelete) return { type: 'DELETE_EXPENSE', id: toDelete.id, description: toDelete.description };
        return { type: 'TEXT', text: `No encontré ese gasto para borrar, ${userName}.` };
      }
      if (name === 'get_expenses_history') {
        const summary = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            // Fix: Use simple string for text contents
            contents: `Resumen de: ${JSON.stringify(currentExpenses)}`,
            config: { systemInstruction: `Haz un resumen breve para ${userName}.` }
        });
        return { type: 'TEXT', text: summary.text };
      }
    }

    return { type: 'TEXT', text: response.text || "No pude procesar eso, ¿probamos de nuevo?" };
  } catch (error) {
    console.error("Gemini API Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    
    if (msg.includes("fetch")) {
      return { 
        type: 'TEXT', 
        text: "🔌 **Error de Red / Conexión**\n\nTu navegador no puede conectar con Google. Esto suele ser por un **AdBlocker** o extensiones de privacidad. Prueba desactivándolos o usa Modo Incógnito." 
      };
    }
    
    return { type: 'TEXT', text: `⚠️ Error: ${msg}` };
  }
}
