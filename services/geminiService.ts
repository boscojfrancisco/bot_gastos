
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Expense } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      expenseDate: { type: Type.STRING, description: 'Fecha del gasto en formato YYYY-MM-DD. Si es hoy, usa la fecha actual.' },
    },
    required: ['amount', 'category', 'description', 'expenseDate'],
  },
};

const deleteExpenseTool: FunctionDeclaration = {
  name: 'delete_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Elimina un gasto existente buscando por descripción o monto.',
    properties: {
      searchQuery: { type: Type.STRING, description: 'Palabra clave o monto para identificar el gasto a borrar' },
    },
    required: ['searchQuery'],
  },
};

const queryExpensesTool: FunctionDeclaration = {
  name: 'get_expenses_history',
  parameters: {
    type: Type.OBJECT,
    description: 'Obtiene el historial para resúmenes temporales.',
    properties: {},
  },
};

export async function processUserMessage(
  text: string, 
  currentExpenses: Expense[]
) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(now);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ role: 'user', parts: [{ text: `Usuario: ${text}` }] }],
      config: {
        tools: [{ functionDeclarations: [addExpenseTool, deleteExpenseTool, queryExpensesTool] }],
        systemInstruction: `Eres GastoBot Argentina. Hoy es ${dayName}, ${todayStr}.
        REGLAS DE FECHAS:
        1. Si el usuario dice "ayer", calcula la fecha restando 1 día a ${todayStr}.
        2. Si dice "antes de ayer", resta 2 días.
        3. Si menciona un día (ej: "el lunes") o una fecha (ej: "el 10 de marzo"), calcula el YYYY-MM-DD correspondiente.
        4. Si NO menciona fecha, usa ${todayStr}.
        
        REGLAS DE MONTO:
        - Si el monto es < 100, pregunta confirmación antes de registrar.
        
        REGLAS DE RESPUESTA:
        - Sé breve y usa emojis. Confirma siempre la fecha que entendiste.`
      },
    });

    const call = response.candidates?.[0]?.content?.parts.find(p => p.functionCall);
    
    if (call?.functionCall) {
      const { name, args } = call.functionCall;
      
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
        return { type: 'TEXT', text: `No encontré ningún gasto que coincida con "${args.searchQuery}".` };
      }
      
      if (name === 'get_expenses_history') {
        const summaryResponse = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: [{ role: 'user', parts: [{ text: `Gastos: ${JSON.stringify(currentExpenses)}. Pregunta: ${text}. Fecha actual: ${todayStr}` }] }],
            config: {
                systemInstruction: "Analiza los gastos basándote en 'expenseDate'. Calcula totales por periodo. Sé visual y usa negritas."
            }
        });
        return { type: 'TEXT', text: summaryResponse.text };
      }
    }

    return { type: 'TEXT', text: response.text || "No entendí del todo, ¿me lo repetís?" };
  } catch (error) {
    return { type: 'TEXT', text: "Hubo un problema. ¿Podés intentar de nuevo?" };
  }
}
