import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { transcriptText, jobDescription, customInstruction } = req.body;

    if (!transcriptText) {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const contextPrompt = `You are an expert technical interviewer assistant. Based on the interview transcript, generate 1-3 intelligent follow-up questions.

Job Description: ${jobDescription || 'Not provided'}
Custom Instruction: ${customInstruction || 'None'}

Interview Transcript:
${transcriptText}

Generate follow-up questions that:
1. Dig deeper into technical concepts mentioned
2. Explore problem-solving approaches
3. Assess real-world application of skills
4. Challenge the candidate appropriately

Return JSON array with objects containing "question" and "reasoning" fields.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              reasoning: { type: "string" }
            },
            required: ["question", "reasoning"]
          }
        }
      },
      contents: contextPrompt,
    });

    const suggestions = JSON.parse(response.text || '[]');
    res.json({ suggestions });
  } catch (error) {
    console.error('Error generating follow-up suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}