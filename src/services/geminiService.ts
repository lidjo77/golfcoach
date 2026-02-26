import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export interface ShotData {
  shot_detected: boolean;
  club?: string;
  club_speed?: number;
  ball_speed?: number;
  smash_factor?: number;
  launch_angle?: number;
  spin_rate?: number;
  carry_distance?: number;
  analysis: string;
  improvement: string;
  rating: number;
}

const shotSchema = {
  type: Type.OBJECT,
  properties: {
    shot_detected: {
      type: Type.BOOLEAN,
      description: "Whether a new golf shot data is clearly visible on the screen.",
    },
    club: { type: Type.STRING, description: "The club used for the shot if visible." },
    club_speed: { type: Type.NUMBER },
    ball_speed: { type: Type.NUMBER },
    smash_factor: { type: Type.NUMBER },
    launch_angle: { type: Type.NUMBER },
    spin_rate: { type: Type.NUMBER },
    carry_distance: { type: Type.NUMBER },
    analysis: { type: Type.STRING },
    improvement: { type: Type.STRING },
    rating: { type: Type.INTEGER },
  },
  required: ["shot_detected", "analysis", "improvement", "rating"],
};

function getAI() {
  // Use process.env.API_KEY (from selection dialog) or process.env.GEMINI_API_KEY (free tier)
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

export async function analyzeShotImage(base64Image: string, currentClub?: string): Promise<ShotData | null> {
  try {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Analyze the golf simulator data visible on this screen. 
              The user is currently practicing with a ${currentClub || "unknown club"}.
              Extract all shot metrics and provide structured feedback. 
              If no clear shot data is visible or it's the same as a previous state, set shot_detected to false.
              
              COACHING GUIDELINES for 'improvement':
              You are a world-class golf coach. Do NOT just state data. Provide hyper-concrete advice.
              Your 'improvement' field MUST follow this structure:
              1. Vad som händer (t.ex. "Du slår troligen lite ner på bollen")
              2. Varför det händer (t.ex. "Bollen ligger för långt bak")
              3. Exakt vad spelaren ska göra (t.ex. "Flytta bollen 1–2 cm längre fram i stansen")
              4. Vad de ska känna (t.ex. "Känn att du slår upp genom bollen och att bröstet är kvar bakom träffen")
              
              Always respond in Swedish.`,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1],
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: shotSchema,
      },
    });

    if (!response.text) return null;
    return JSON.parse(response.text) as ShotData;
  } catch (error) {
    console.error("Error analyzing shot:", error);
    throw error; // Throw so App.tsx can handle quota errors
  }
}

export async function askCoach(question: string, context: ShotData[], currentClub?: string): Promise<string> {
  try {
    const ai = getAI();
    const historyContext = context.map(s => 
      `Shot (Club: ${s.club || "Unknown"}): ${s.ball_speed}mph ball speed, ${s.carry_distance}yds carry, ${s.spin_rate}rpm spin. Analysis: ${s.analysis}`
    ).join("\n");

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `You are an expert golf coach. Based on the following recent shot history and the fact that the user is currently using a ${currentClub || "unknown club"}, answer the user's question. 
              Be concise, technical, and encouraging.
              
              Context History:
              ${historyContext}
              
              User Question: ${question}`,
            },
          ],
        },
      ],
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error asking coach:", error);
    throw error;
  }
}
