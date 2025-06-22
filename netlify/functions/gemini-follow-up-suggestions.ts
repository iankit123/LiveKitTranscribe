import { Handler } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const { transcriptText, jobDescription, customInstruction } = JSON.parse(event.body || '{}');

    if (!transcriptText) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Transcript text is required' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    let systemPrompt = `You are an expert interviewer assistant. Based on the interview transcript, generate 2-3 insightful follow-up questions that will help assess the candidate's capabilities.

Rules:
1. Generate questions that dig deeper into what the candidate has said
2. Focus on specific examples, problem-solving, and technical depth
3. Avoid generic or obvious questions
4. Make questions relevant to the role and industry
5. Each question should have a clear reasoning for why it's valuable

Response format (JSON only):
{
  "suggestions": [
    {
      "question": "Your specific follow-up question here",
      "reasoning": "Why this question is valuable for assessment"
    }
  ]
}`;

    if (jobDescription) {
      systemPrompt += `\n\nJob Context: ${jobDescription}`;
    }

    if (customInstruction) {
      systemPrompt += `\n\nAdditional Instructions: ${customInstruction}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            suggestions: {
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
          required: ["suggestions"]
        }
      },
      contents: `Interview transcript: ${transcriptText}`
    });

    const rawJson = response.text;
    if (rawJson) {
      const data = JSON.parse(rawJson);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      };
    } else {
      throw new Error('Empty response from Gemini');
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to generate suggestions' })
    };
  }
};