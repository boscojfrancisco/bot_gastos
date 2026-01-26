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
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(now);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        tools: [{ functionDeclarations: [addExpenseTool, deleteExpenseTool, queryExpensesTool] }],
        systemInstruction: `Eres GastoBot Argentina. Usuario: ${userName}. Hoy: ${dayName} ${todayStr}. 
        Misión: Ayudar a registrar gastos. Sé breve y usa emojis. Si el usuario te pide borrar algo, busca en el historial que te proporciono.`
      },
    });

    // Usar la propiedad .functionCalls recomendada por la SDK para evitar errores de 'parts undefined'
    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const { name, args } = functionCalls[0];
      
      if (name === 'add_expense') {
        return { type: 'ADD_EXPENSE', data: args };
      }
      
      if (name === 'delete_expense') {
        const query = (args.searchQuery as string).toLowerCase();
        const toDelete = currentExpenses.find(e => 
          e.description.toLowerCase().includes(query) || 
          e.amount.toString() === query ||
          e.category.toLowerCase().includes(query)
        );
        if (toDelete) return { type: 'DELETE_EXPENSE', id: toDelete.id, description: toDelete.description };
        return { type: 'TEXT', text: `No encontré ningún gasto que coincida con "${query}", ${userName}.` };
      }
      
      if (name === 'get_expenses_history') {
        const summary = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera un resumen muy breve de estos gastos para ${userName}: ${JSON.stringify(currentExpenses)}`,
            config: { systemInstruction: "Responde como un asistente financiero argentino amable." }
        });
        return { type: 'TEXT', text: summary.text || "No tengo gastos registrados todavía." };
      }
    }

    return { type: 'TEXT', text: response.text || "No entendí bien eso, ¿podrías repetirlo?" };
  } catch (error) {
    console.error("Gemini API Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    
    if (msg.includes("fetch")) {
      return { 
        type: 'TEXT', 
        text: "🔌 **Error de Conexión**\n\nNo pude contactar al servidor. Probá desactivando AdBlockers o revisando tu conexión a internet." 
      };
    }
    
    return { type: 'TEXT', text: `⚠️ Ups, algo salió mal: ${msg}` };
  }
}