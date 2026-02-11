import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient && process.env.API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiClient;
};

export const generateBingoPhrase = async (number: number, lang: 'vi' | 'en'): Promise<string> => {
  const client = getAiClient();
  if (!client) return '';

  const prompt = lang === 'vi' 
    ? `Tạo một câu nói vần điệu ngắn gọn, hài hước hoặc dân gian Việt Nam liên quan đến số lô tô: ${number}. Chỉ trả về câu nói đó, không giải thích. Ví dụ số 1: "Số 1 là con gà con".`
    : `Generate a short, witty, or traditional bingo call phrase for the number ${number}. Return only the phrase. Example for 22: "Two little ducks".`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    return '';
  }
};

export const generateBotChat = async (context: string, lang: 'vi' | 'en'): Promise<string> => {
  const client = getAiClient();
  if (!client) return '';

  const prompt = lang === 'vi'
    ? `Bạn là một người chơi lô tô vui tính trong phòng chat. Bối cảnh: "${context}". Hãy viết một câu chat ngắn (dưới 10 từ) để trêu đùa hoặc chúc mừng. Không dùng ngoặc kép.`
    : `You are a fun bingo player in a chat room. Context: "${context}". Write a very short chat message (under 10 words) to tease or congratulate. No quotes.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || '';
  } catch (error) {
    return ''; // Fail silently for chat
  }
};
