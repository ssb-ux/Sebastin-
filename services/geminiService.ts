import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-3-pro-preview as requested for advanced multimodal capabilities
const MODEL_NAME = "gemini-3-pro-preview";

export const generateAIResponse = async (
  history: Message[],
  newMessage: string,
  base64Image?: string,
  base64Video?: string
): Promise<string> => {
  try {
    const contents = [];

    // Add history context (simplified for this demo)
    // In a real app, you would format this as a proper chat history array for the SDK
    // Here we just append the text context for simplicity in single-turn generation or manually constructing parts
    
    // Construct the current prompt parts
    const parts: any[] = [];
    
    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      });
    }

    if (base64Video) {
      parts.push({
        inlineData: {
          mimeType: "video/mp4",
          data: base64Video,
        },
      });
    }

    parts.push({ text: newMessage });

    // System instruction context
    const systemInstruction = `You are Stitch AI, an elite high-performance athletic coach. 
    Your tone is technical, motivating, and concise. 
    You are an expert in biomechanics, nutrition, and exercise physiology.
    If the user uploads an image of equipment, explain how to use it safely.
    If the user uploads a video of a workout, critique their form with precision.
    If the user uploads food, estimate macros and suitability for hypertrophy.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        role: "user",
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 1024 } // Enable reasoning for better coaching
      }
    });

    return response.text || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Connection to Stitch Neural Net failed. Please check your API key and connection.";
  }
};

export const generateWorkoutPlan = async (goal: string, level: number): Promise<string> => {
  try {
    const levelText = level < 25 ? "Beginner" : level < 75 ? "Intermediate" : "Elite";
    const prompt = `
      User Profile:
      - Goal: ${goal}
      - Experience Level: ${levelText} (${level}/100)

      Generate a brief, high-intensity "Coach's Protocol" for this user.
      Format:
      1. A one-sentence motivating directive (e.g., "Focus on eccentric control.").
      2. Specific Warm-up Protocol: List 3 dynamic movements to prime the nervous system.
      3. Main Directive: Three bullet points of specific technical advice for their goal.
      4. Cool-down Protocol: List 2 static stretches or recovery techniques.
      
      Keep it short, cyberpunk style, and actionable.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text || "Protocol generation failed. Proceed with standard operating procedure.";
  } catch (error) {
    console.error("Gemini API Plan Error:", error);
    return "Offline Mode. Standard hypertrophy protocols apply.";
  }
};