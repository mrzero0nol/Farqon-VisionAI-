// 'use server'
'use server';
/**
 * @fileOverview A Genkit flow for analyzing the camera feed and providing a description of what it sees.
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
  summary: z.string().describe('A comprehensive and detailed description of what the AI sees in the camera feed, covering objects, their attributes, spatial relationships, people, background, and overall context.'),
});
export type AnalyzeCameraFeedOutput = z.infer<typeof AnalyzeCameraFeedOutputSchema>;

export async function analyzeCameraFeed(input: AnalyzeCameraFeedInput): Promise<AnalyzeCameraFeedOutput> {
  return analyzeCameraFeedFlow(input);
}

const analyzeCameraFeedPrompt = ai.definePrompt({
  name: 'analyzeCameraFeedPrompt',
  input: {schema: AnalyzeCameraFeedInputSchema},
  output: {schema: AnalyzeCameraFeedOutputSchema},
  prompt: `You are a highly perceptive AI visual analysis expert. Your task is to meticulously examine the provided image from a camera feed and generate a detailed, accurate description.

Focus on:
1.  **Object Identification:** Clearly identify all prominent objects. For each object, mention its type, and if discernible, its color, material, or any significant features.
2.  **Spatial Relationships:** Describe where objects are located in relation to each other and the overall scene (e.g., "a red_mug is on_the_table", "a_cat_is_under_the_chair").
3.  **People (if present):** Describe their apparent number, general actions or poses (e.g., "one person sitting", "two people walking"). Avoid guessing identities or making assumptions about emotions unless very obvious.
4.  **Background and Environment:** Describe the setting (e.g., "an office room", "an outdoor park scene"), including significant background elements.
5.  **Overall Scene Context:** Provide a brief summary of what is happening or depicted in the image as a whole.

Strive for factual accuracy and comprehensive coverage. If an object is unclear or ambiguous, you can state that. Your goal is to provide a rich textual representation of the visual input.

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
