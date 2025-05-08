import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // User requested and now using 'googleai/gemini-2.5-flash-preview-04-17'.
  // This model is expected to provide advanced multimodal capabilities.
  model: 'googleai/gemini-2.5-flash-preview-04-17',
});

