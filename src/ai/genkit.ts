import {genkit, Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { getCurrentApiKey } from './gemini-key-manager';

let cachedAi: Genkit | null = null;
let cachedApiKey: string | null = null;

export function getAiInstance(apiKey?: string): Genkit {
  const keyToUse = apiKey || getCurrentApiKey();
  
  if (cachedAi && cachedApiKey === keyToUse) {
    return cachedAi;
  }
  
  cachedAi = genkit({
    plugins: [googleAI({
      apiKey: keyToUse,
    })],
    model: 'googleai/gemini-2.5-flash-lite',
  });
  cachedApiKey = keyToUse;
  
  return cachedAi;
}

export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
  })],
  model: 'googleai/gemini-2.5-flash-lite',
});
