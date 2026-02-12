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
    description: 'Registra un nuevo gasto. Llama a esta función varias veces si el usuario menciona múltiples gastos en el mismo mensaje.',
    properties: {
      amount: { type: Type.NUMBER, description: 'Monto en pesos' },
      category: { type: Type.STRING, description: 'Categoría del gasto', enum: CATEGORIES },
      description: { type: Type.STRING, description: 'Breve descripción de qué se compró' },
      expenseDate: { type: Type.STRING, description: 'Fecha del gasto en formato YYYY-MM-DD. Por defecto hoy.' },
    },
    required: ['amount', 'category', 'description', 'expenseDate'],
  },
};

const getExpensesHistoryTool: FunctionDeclaration = {
  name: 'get_expenses_history',
  parameters: {
    type: Type.OBJECT,
    description: 'Consulta el historial de gastos para generar reportes. Puede filtrar por fechas específicas, meses o rangos.',
    properties: {
      startDate: { type: Type.STRING, description: 'Fecha de inicio YYYY-MM-DD (opcional)' },
      endDate: { type: Type.STRING, description: 'Fecha de fin YYYY-MM-DD (opcional)' },
      filterDescription: { type: Type.STRING, description: 'Descripción textual de la consulta del usuario (ej: "gastos de febrero" o "esta semana") para contexto del reporte.' }
    },
  },
};

const deleteExpenseTool: FunctionDeclaration = {
  name: 'delete_expense',
  parameters: {
    type: Type.OBJECT,
    description: 'Elimina un gasto específico.',
    properties: {
      searchQuery: { type: Type.STRING, description: 'Descripción o monto para identificar el gasto a borrar.' },
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
  const dayName = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(now);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        tools: [{ functionDeclarations: [addExpenseTool, deleteExpenseTool, getExpensesHistoryTool] }],
        systemInstruction: `Eres GastoBot Argentina. Usuario: ${userName}. Hoy es ${dayName} ${todayStr}.
        
        REGLAS CRÍTICAS:
        1. Si el usuario menciona varios gastos (ej: "Gaste 10 en pan, 20 en taxi y 30 en luz"), DEBES llamar a 'add_expense' UNA VEZ POR CADA GASTO (en este ejemplo, 3 veces).
        2. Si el usuario pide ver gastos de una fecha, mes o rango (ej: "cuanto gaste en febrero", "gastos de los ultimos 10 dias"), llama a 'get_expenses_history' con las fechas correspondientes calculadas desde hoy (${todayStr}).
        3. Mantén un tono informal, usa emojis y jerga argentina (che, boludo, plata, etc).
        4. Categorías permitidas: ${CATEGORIES.join(', ')}.`
      },
    });

    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      return { type: 'FUNCTION_CALLS', calls: functionCalls };
    }

    return { type: 'TEXT', text: response.text || "No entendí, ¿me lo repetís?" };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { type: 'TEXT', text: "⚠️ Error al procesar el mensaje. Revisa tu conexión." };
  }
}
