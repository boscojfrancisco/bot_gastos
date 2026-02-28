
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Expense } from "../types";

const CATEGORIES = [
  'Luz', 'Agua', 'Internet', 'Hipoteca', 'Alquiler', 
  'Teléfono', 'Servicio Doméstico', 'Ocio', 'Restaurantes', 
  'Transporte', 'Otros'
];

// Instantiate once to reuse
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const addExpenseTool: FunctionDeclaration = {
  name: 'add_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Registra un nuevo gasto.',
    properties: {
      amount: { type: Type.NUMBER, description: 'Monto en pesos' },
      category: { type: Type.STRING, description: 'Categoría del gasto', enum: CATEGORIES },
      description: { type: Type.STRING, description: 'Descripción breve' },
      expenseDate: { type: Type.STRING, description: 'Fecha YYYY-MM-DD' },
    },
    required: ['amount', 'category', 'description', 'expenseDate'],
  },
};

const getExpensesHistoryTool: FunctionDeclaration = {
  name: 'get_expenses_history',
  parameters: {
    type: Type.OBJECT,
    description: 'Consulta historial para reportes.',
    properties: {
      startDate: { type: Type.STRING, description: 'Inicio YYYY-MM-DD' },
      endDate: { type: Type.STRING, description: 'Fin YYYY-MM-DD' },
      filterDescription: { type: Type.STRING, description: 'Contexto de la consulta' }
    },
  },
};

const deleteExpenseTool: FunctionDeclaration = {
  name: 'delete_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Borra un gasto.',
    properties: {
      searchQuery: { type: Type.STRING, description: 'Nombre o monto' },
    },
    required: ['searchQuery'],
  },
};

export async function processUserMessage(
  text: string, 
  currentExpenses: Expense[],
  userName: string = "Usuario"
) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        tools: [{ functionDeclarations: [addExpenseTool, deleteExpenseTool, getExpensesHistoryTool] }],
        systemInstruction: `Eres GastoBot Argentina. Usuario: ${userName}. Hoy: ${todayStr}.
        
        REGLAS CRÍTICAS:
        1. NO SALUDES. NO DES EXPLICACIONES.
        2. Si preguntan "¿Cuánto gasté?", "Mis gastos", "Gastos de hoy", etc., USA SIEMPRE 'get_expenses_history'.
        3. Si no especifican fecha, asume el mes actual (${firstDayOfMonth} al ${todayStr}).
        4. Si preguntan por un periodo (ej: "10 días"), calcula las fechas correctas y llama a la herramienta.
        5. Sé una herramienta, no un amigo. Sé minimalista.
        6. Si el usuario dice algo como "Gaste 500 en pan", asume que son pesos argentinos.`
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) return { type: 'FUNCTION_CALLS', calls: functionCalls };
    return { type: 'TEXT', text: response.text || "No entendí la solicitud." };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    let errorMessage = "Un error desconocido ocurrió al procesar con la IA.";
    if (error.status) {
      errorMessage = `Error de la IA (${error.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = `Error de comunicación con la IA: ${error.message}`;
    }
    return { type: 'TEXT', text: `⚠️ ${errorMessage}` };
  }
}
