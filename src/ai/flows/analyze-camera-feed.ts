// 'use server'
'use server';
/**
 * @fileOverview A Genkit flow for analyzing the camera feed and providing a summary of what it sees.
 *
 * - analyzeCameraFeed - A function that handles the camera feed analysis process.
 * - AnalyzeCameraFeedInput - The input type for the analyzeCameraFeed function.
 * - AnalyzeCameraFeedOutput - The return type for the analyzeCameraFeed function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCameraFeedInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo from the camera feed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeCameraFeedInput = z.infer<typeof AnalyzeCameraFeedInputSchema>;

const AnalyzeCameraFeedOutputSchema = z.object({
  summary: z.string().describe('A summary of what the chatbot sees in the camera feed.'),
});
export type AnalyzeCameraFeedOutput = z.infer<typeof AnalyzeCameraFeedOutputSchema>;

export async function analyzeCameraFeed(input: AnalyzeCameraFeedInput): Promise<AnalyzeCameraFeedOutput> {
  return analyzeCameraFeedFlow(input);
}

const analyzeCameraFeedPrompt = ai.definePrompt({
  name: 'analyzeCameraFeedPrompt',
  input: {schema: AnalyzeCameraFeedInputSchema},
  output: {schema: AnalyzeCameraFeedOutputSchema},
  prompt: `You are an AI assistant that analyzes images from a camera feed and provides a brief summary of what you see.

  Analyze the following image and provide a summary of the scene.

  Image: {{media url=photoDataUri}}`,
});

const analyzeCameraFeedFlow = ai.defineFlow(
  {
    name: 'analyzeCameraFeedFlow',
    inputSchema: AnalyzeCameraFeedInputSchema,
    outputSchema: AnalyzeCameraFeedOutputSchema,
  },
  async input => {
    const {output} = await analyzeCameraFeedPrompt(input);
    return output!;
  }
);
