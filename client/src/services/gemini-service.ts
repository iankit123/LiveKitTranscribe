import { GoogleGenAI } from "@google/genai";

export interface FollowUpSuggestion {
  question: string;
  reasoning?: string;
}

export interface FollowUpResponse {
  suggestions: FollowUpSuggestion[];
}

class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // In development, we'll use a server endpoint to proxy the Gemini API
    this.ai = new GoogleGenAI({ apiKey: 'proxy' });
  }

  async getFollowUpSuggestions(transcriptText: string): Promise<FollowUpResponse> {
    try {
      const response = await fetch('/api/gemini/follow-up-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptText
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FollowUpResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting follow-up suggestions:', error);
      throw new Error(`Failed to get follow-up suggestions: ${error}`);
    }
  }
}

export const geminiService = new GeminiService();