// src/ai/flows/contextual-chat-with-vision.ts
'use server';
/**
 * @fileOverview A contextual chat AI agent that can interact with camera feed.
 *
 * - contextualChatWithVision - A function that handles the chat process.
 * - ContextualChatWithVisionInput - The input type for the contextualChatWithVision function.
 * - ContextualChatWithVisionOutput - The return type for the contextualChatWithVision function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContextualChatWithVisionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo from the camera feed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().describe('The question about the camera feed.'),
});
export type ContextualChatWithVisionInput = z.infer<
  typeof ContextualChatWithVisionInputSchema
>;

const ContextualChatWithVisionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type ContextualChatWithVisionOutput = z.infer<
  typeof ContextualChatWithVisionOutputSchema
>;

export async function contextualChatWithVision(
  input: ContextualChatWithVisionInput
): Promise<ContextualChatWithVisionOutput> {
  return contextualChatWithVisionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contextualChatWithVisionPrompt',
  input: {schema: ContextualChatWithVisionInputSchema},
  output: {schema: ContextualChatWithVisionOutputSchema},
  prompt: `You are an intelligent chatbot that can see and answer questions about images.

  A user has provided you with an image from their camera, and is asking you a question about it.
  Use the image to answer their question as accurately as possible.

  Question: {{{question}}}
  Image: {{media url=photoDataUri}}
  `,
});

const contextualChatWithVisionFlow = ai.defineFlow(
  {
    name: 'contextualChatWithVisionFlow',
    inputSchema: ContextualChatWithVisionInputSchema,
    outputSchema: ContextualChatWithVisionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
