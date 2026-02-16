
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        tools: [{ functionDeclarations: [addExpenseTool, deleteExpenseTool, getExpensesHistoryTool] }],
        systemInstruction: `Eres GastoBot Argentina. Usuario: ${userName}. Fecha hoy: ${todayStr}.
        
        REGLAS DE ORO:
        1. SE EXTREMADAMENTE BREVE. No saludes si no es necesario.
        2. Si el usuario pregunta cuánto gastó o pide ver gastos (ej: "cuánto gasté", "gastos del mes", "gastos de la semana"), DEBES llamar a 'get_expenses_history'. 
        3. Si no especifica fecha, asume el mes actual (desde ${firstDayOfMonth} hasta ${todayStr}).
        4. No hables de más. Ve directo a la acción.`
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) return { type: 'FUNCTION_CALLS', calls: functionCalls };
    return { type: 'TEXT', text: response.text || "No entendí, che." };
  } catch (error) {
    return { type: 'TEXT', text: "⚠️ Error de conexión." };
  }
}
