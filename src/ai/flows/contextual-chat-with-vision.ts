
// src/ai/flows/contextual-chat-with-vision.ts
'use server';
/**
 * @fileOverview A contextual chat AI agent that can interact with camera feed,
 * maintain conversation history, and search the internet.
 *
 * - contextualChatWithVision - A function that handles the chat process.
 * - ContextualChatWithVisionInput - The input type for the contextualChatWithVision function.
 * - ContextualChatWithVisionOutput - The return type for the contextualChatWithVision function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchInternetTool } from '@/ai/tools'; // Import the new tool

const ChatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ContextualChatWithVisionInputSchema = z.object({
  photoDataUri: z
    .string()
    .optional() 
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
  tools: [searchInternetTool], // Make the tool available to the prompt
  prompt: `Anda adalah chatbot AI serbaguna yang cerdas, Farqon VisionAI.
Anda dapat melihat melalui kamera, memahami gambar, dan menjawab pertanyaan pengguna dalam sebuah percakapan berkelanjutan.
Anda juga memiliki kemampuan untuk mencari informasi di internet secara real-time menggunakan alat 'searchInternetTool'.

Tugas Utama Anda:
1.  Pahami pertanyaan pengguna dengan saksama.
2.  Analisis gambar saat ini (jika diberikan dan relevan dengan pertanyaan).
3.  Gunakan riwayat percakapan sebelumnya untuk menjaga konteks.
4.  Jika pertanyaan pengguna secara eksplisit meminta pencarian internet (misalnya, "cari di internet tentang X", "apa berita terbaru Y?", "temukan informasi Z"), atau jika pertanyaan tersebut memerlukan informasi yang sangat baru atau spesifik yang kemungkinan besar tidak ada dalam data pelatihan Anda (seperti peristiwa terkini, harga saham real-time, cuaca hari ini), maka **gunakan alat 'searchInternetTool'**. Ekstrak topik atau kata kunci utama dari pertanyaan pengguna sebagai parameter 'query' untuk alat tersebut.
5.  Setelah menggunakan alat (jika perlu), gabungkan informasi yang diperoleh dari alat, analisis gambar, dan riwayat percakapan untuk menyusun jawaban yang komprehensif, akurat, dan relevan.
6.  Jika Anda menggunakan alat pencarian, sebutkan secara singkat bahwa Anda mencari informasi tersebut dari internet.
7.  Selalu berikan jawaban Anda dalam Bahasa Indonesia.

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
Gambar Saat Ini (gunakan ini jika relevan dengan pertanyaan dan pertanyaan tersebut berkaitan dengan analisis visual): {{media url=photoDataUri}}
{{else}}
(Tidak ada gambar baru yang diberikan untuk pertanyaan saat ini, atau pertanyaan tidak memerlukan analisis gambar)
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
    console.log('[contextualChatWithVisionFlow] Input received:', input.question, 'Image present:', !!input.photoDataUri);
    const {output} = await prompt(input);
    if (!output) {
      console.error('[contextualChatWithVisionFlow] Prompt did not return an output.');
      return { answer: "Maaf, saya tidak dapat menghasilkan respons saat ini." };
    }
    console.log('[contextualChatWithVisionFlow] Output generated:', output.answer);
    return output;
  }
);

