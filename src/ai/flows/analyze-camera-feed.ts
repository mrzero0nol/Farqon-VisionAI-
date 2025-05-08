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
  summary: z.string().describe('Deskripsi yang komprehensif dan mendetail tentang apa yang dilihat AI di umpan kamera, mencakup objek, atributnya, hubungan spasial, orang, latar belakang, dan konteks keseluruhan.'),
});
export type AnalyzeCameraFeedOutput = z.infer<typeof AnalyzeCameraFeedOutputSchema>;

export async function analyzeCameraFeed(input: AnalyzeCameraFeedInput): Promise<AnalyzeCameraFeedOutput> {
  return analyzeCameraFeedFlow(input);
}

const analyzeCameraFeedPrompt = ai.definePrompt({
  name: 'analyzeCameraFeedPrompt',
  input: {schema: AnalyzeCameraFeedInputSchema},
  output: {schema: AnalyzeCameraFeedOutputSchema},
  prompt: `Anda adalah seorang ahli analisis visual AI yang sangat perseptif. Tugas Anda adalah memeriksa dengan cermat gambar yang disediakan dari umpan kamera dan menghasilkan deskripsi yang detail dan akurat.

Fokus pada:
1.  **Identifikasi Objek:** Identifikasi dengan jelas semua objek yang menonjol. Untuk setiap objek, sebutkan jenisnya, dan jika dapat dilihat, warna, bahan, atau fitur penting lainnya.
2.  **Hubungan Spasial:** Jelaskan di mana objek berada dalam kaitannya satu sama lain dan keseluruhan pemandangan (misalnya, "cangkir_merah ada di_atas_meja", "kucing_ada_di_bawah_kursi").
3.  **Orang (jika ada):** Jelaskan perkiraan jumlah mereka, tindakan umum atau pose (misalnya, "satu orang duduk", "dua orang berjalan"). Hindari menebak identitas atau membuat asumsi tentang emosi kecuali sangat jelas.
4.  **Latar Belakang dan Lingkungan:** Jelaskan latarnya (misalnya, "ruang kantor", "pemandangan taman luar ruangan"), termasuk elemen latar belakang yang signifikan.
5.  **Konteks Pemandangan Keseluruhan:** Berikan ringkasan singkat tentang apa yang terjadi atau digambarkan dalam gambar secara keseluruhan.

Berusahalah untuk akurasi faktual dan cakupan yang komprehensif. Jika suatu objek tidak jelas atau ambigu, Anda dapat menyatakannya. Tujuan Anda adalah memberikan representasi tekstual yang kaya dari input visual.
Harap berikan jawaban Anda dalam Bahasa Indonesia.
Gambar: {{media url=photoDataUri}}`,
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

