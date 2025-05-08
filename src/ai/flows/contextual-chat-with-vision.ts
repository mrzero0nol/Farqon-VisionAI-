// src/ai/flows/contextual-chat-with-vision.ts
'use server';
/**
 * @fileOverview A contextual chat AI agent that can interact with camera feed and maintain conversation history.
 *
 * - contextualChatWithVision - A function that handles the chat process.
 * - ContextualChatWithVisionInput - The input type for the contextualChatWithVision function.
 * - ContextualChatWithVisionOutput - The return type for the contextualChatWithVision function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ContextualChatWithVisionInputSchema = z.object({
  photoDataUri: z
    .string()
    .optional() // Made optional as not every message might have a new photo, though current UI sends it.
    .describe(
      "A photo from the camera feed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. This is for the CURRENT turn."
    ),
  question: z.string().describe('The question about the camera feed for the CURRENT turn.'),
  history: z
    .array(ChatHistoryItemSchema)
    .optional()
    .describe('Previous messages in the conversation.'),
});
export type ContextualChatWithVisionInput = z.infer<
  typeof ContextualChatWithVisionInputSchema
>;

const ContextualChatWithVisionOutputSchema = z.object({
  answer: z.string().describe('Jawaban atas pertanyaan tersebut.'),
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
  prompt: `Anda adalah chatbot cerdas yang dapat melihat dan menjawab pertanyaan tentang gambar dalam sebuah percakapan berkelanjutan.
Gunakan konteks percakapan sebelumnya dan gambar saat ini (jika ada dan relevan) untuk menjawab pertanyaan pengguna.
Harap berikan jawaban Anda dalam Bahasa Indonesia.

Riwayat Percakapan Sebelumnya:
{{#if history}}
  {{#each history}}
    {{this.role}}: {{this.content}}
  {{/each}}
{{else}}
Tidak ada riwayat percakapan. Ini adalah pesan pertama.
{{/if}}

---
Input Pengguna Saat Ini:
Pertanyaan: {{{question}}}
{{#if photoDataUri}}
Gambar Saat Ini (gunakan ini jika relevan dengan pertanyaan): {{media url=photoDataUri}}
{{else}}
(Tidak ada gambar baru yang diberikan untuk pertanyaan saat ini)
{{/if}}
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
