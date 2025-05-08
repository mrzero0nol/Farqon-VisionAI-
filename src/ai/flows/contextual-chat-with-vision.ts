
// src/ai/flows/contextual-chat-with-vision.ts
'use server';
/**
 * @fileOverview A contextual chat AI agent that can interact with camera feed,
 * maintain conversation history, search the internet, and count objects in images.
 *
 * - contextualChatWithVision - A function that handles the chat process.
 * - ContextualChatWithVisionInput - The input type for the contextualChatWithVision function.
 * - ContextualChatWithVisionOutput - The return type for the contextualChatWithVision function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchInternetTool } from '@/ai/tools';

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

// Schema for bounding boxes and counted objects
const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(1).describe('Normalized top-left x-coordinate of the bounding box (0.0 to 1.0).'),
  y: z.number().min(0).max(1).describe('Normalized top-left y-coordinate of the bounding box (0.0 to 1.0).'),
  width: z.number().min(0).max(1).describe('Normalized width of the bounding box (0.0 to 1.0).'),
  height: z.number().min(0).max(1).describe('Normalized height of the bounding box (0.0 to 1.0).'),
});

const CountedObjectInstanceSchema = z.object({
  boundingBox: BoundingBoxSchema.describe('Bounding box for this specific instance of the object.'),
});

const CountedObjectSchema = z.object({
  name: z.string().describe('The name of the object type identified (e.g., "apel", "mobil").'),
  count: z.number().int().min(0).describe('The number of instances of this object type found.'),
  instances: z.array(CountedObjectInstanceSchema).describe('A list of all detected instances of this object type, each with its bounding box.'),
});

const ContextualChatWithVisionOutputSchema = z.object({
  answer: z.string().describe('Jawaban atas pertanyaan tersebut.'),
  countedObjects: z.array(CountedObjectSchema).optional().describe('An array of objects counted in the image, each with its name, count, and bounding boxes for individual instances. This should only be populated if the user specifically asked to count objects and an image was provided.'),
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
  tools: [searchInternetTool],
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
8.  Saat Anda merespons, jika Anda menggunakan tanda bintang (*), gunakanlah sebagai tanda baca seperti untuk membuat poin-poin atau untuk penekanan, dan jangan menyebutkannya sebagai 'asteris' atau 'tanda bintang'.

Instruksi Khusus untuk Menghitung Objek:
Jika pertanyaan pengguna secara eksplisit meminta untuk menghitung objek (misalnya, "hitung jumlah X", "ada berapa Y di gambar ini?", "lingkari dan hitung semua Z yang terlihat", "identifikasi dan hitung benda-benda di gambar ini", "berapa banyak objek ini"), maka Anda HARUS:
1.  Memastikan ada gambar yang disediakan melalui photoDataUri. Jika tidak ada, jelaskan bahwa Anda memerlukan gambar untuk menghitung.
2.  Menganalisis gambar yang diberikan dengan cermat.
3.  Identifikasi objek-objek yang berbeda dalam gambar sesuai permintaan pengguna.
4.  Untuk setiap JENIS objek yang Anda temukan dan relevan dengan permintaan:
    a.  Sebutkan NAMA objek tersebut (misalnya, "apel", "orang", "mobil").
    b.  Hitung berapa banyak INSTANSI dari jenis objek tersebut yang Anda lihat.
5.  Untuk setiap INSTANSI individual dari objek yang Anda hitung, berikan koordinat KOTAK PEMBATAS (bounding box).
    Kotak pembatas harus berupa objek dengan properti \`x\`, \`y\`, \`width\`, dan \`height\`.
    - \`x\`: Koordinat x (horizontal) dari sudut kiri atas kotak, dinormalisasi antara 0.0 dan 1.0.
    - \`y\`: Koordinat y (vertikal) dari sudut kiri atas kotak, dinormalisasi antara 0.0 dan 1.0.
    - \`width\`: Lebar kotak, dinormalisasi antara 0.0 dan 1.0.
    - \`height\`: Tinggi kotak, dinormalisasi antara 0.0 dan 1.0.
    Semua nilai ini relatif terhadap dimensi gambar keseluruhan.
6.  Isi bidang \`countedObjects\` dalam output JSON Anda sesuai dengan struktur yang didefinisikan.
    - Setiap elemen dalam array \`countedObjects\` harus mewakili satu JENIS objek yang Anda hitung.
    - Setiap elemen harus memiliki bidang \`name\` (nama jenis objek), \`count\` (jumlah instansi jenis objek tersebut), dan \`instances\`.
    - Bidang \`instances\` harus berupa array, di mana setiap elemennya adalah objek yang berisi \`boundingBox\` untuk setiap instansi individual yang terdeteksi dari jenis objek tersebut.
7.  Dalam jawaban TEKSTUAL Anda (\`answer\`), ringkaslah apa yang telah Anda hitung (misalnya, "Saya melihat 3 apel dan 1 pisang."), jumlah total setiap jenis objek, dan sebutkan bahwa Anda telah (secara konseptual) "menandai" atau "melingkari" objek-objek tersebut jika Anda berhasil mengisi data \`countedObjects\`. Jangan mencoba menggambar atau memodifikasi gambar secara langsung; cukup berikan data bounding box melalui \`countedObjects\`.
8.  Jika tidak ada gambar yang disediakan (\`photoDataUri\` kosong) meskipun pengguna meminta penghitungan, atau jika pertanyaan tidak terkait dengan penghitungan objek di gambar, JANGAN mengisi bidang \`countedObjects\` dan jelaskan dalam \`answer\` jika relevan.

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
Gambar Saat Ini (gunakan ini jika relevan dengan pertanyaan dan pertanyaan tersebut berkaitan dengan analisis visual atau penghitungan objek): {{media url=photoDataUri}}
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
    console.log('[contextualChatWithVisionFlow] Output generated. Answer:', output.answer, 'Counted Objects:', output.countedObjects ? output.countedObjects.length : 'None');
    return output;
  }
);

