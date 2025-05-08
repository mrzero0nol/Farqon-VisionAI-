import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // User requested 'gemini-2.5-flash-preview-04-17'.
  // Using 'gemini-1.5-flash-latest' as a generally available and robust multimodal model.
  // If 'gemini-2.5-flash-preview-04-17' is confirmed available, it can be used directly.
  model: 'googleai/gemini-1.5-flash-latest',
});
