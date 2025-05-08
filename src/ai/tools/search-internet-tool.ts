
/**
 * @fileOverview A Genkit tool for searching the internet using Google Custom Search API.
 *
 * - searchInternetTool - The AI tool definition.
 * - SearchInternetInputSchema - Zod schema for the tool's input.
 * - SearchInternetInput - TypeScript type for the tool's input.
 * - SearchInternetOutputSchema - Zod schema for the tool's output.
 * - SearchInternetOutput - TypeScript type for the tool's output.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SearchInternetInputSchema = z.object({
  query: z.string().describe('The search query to use for finding information on the internet.'),
});
export type SearchInternetInput = z.infer<typeof SearchInternetInputSchema>;

export const SearchInternetOutputSchema = z.object({
  searchResults: z.string().describe('A summary of the information found on the internet related to the query. This should be presented as a direct answer or summary of findings.'),
});
export type SearchInternetOutput = z.infer<typeof SearchInternetOutputSchema>;

export const searchInternetTool = ai.defineTool(
  {
    name: 'searchInternetTool',
    description: 'Searches Google for real-time information based on a user query. Use this tool if the user explicitly asks to "cari di internet", "search online", "browse the web for", "google", "cari di google", or if their question implies a need for current, up-to-date information that is likely not in your training data (e.g., news, current events, real-time stock prices, today\'s weather).',
    inputSchema: SearchInternetInputSchema,
    outputSchema: SearchInternetOutputSchema,
  },
  async (input) => {
    console.log(`[searchInternetTool] Received search query: "${input.query}"`);
    
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !cx) {
      console.error('[searchInternetTool] Google API Key (GOOGLE_API_KEY) or Custom Search Engine ID (GOOGLE_CSE_ID) not configured in environment variables.');
      return { searchResults: "Maaf, fitur pencarian internet tidak dikonfigurasi dengan benar. Kunci API Google atau ID Mesin Pencari Kustom tidak tersedia di pengaturan server." };
    }

    // Get top 3 results, you can adjust 'num' parameter
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(input.query)}&num=3&hl=id&gl=id`; // Added hl=id and gl=id for Indonesian results

    try {
      // Redact API key from log
      const loggedUrl = searchUrl.replace(apiKey, "GOOGLE_API_KEY_REDACTED");
      console.log(`[searchInternetTool] Fetching from: ${loggedUrl}`);
      
      const response = await fetch(searchUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[searchInternetTool] Google Search API request failed with status ${response.status}: ${errorBody}`);
        // Try to parse error for more specific message
        let googleErrorMsg = `Permintaan API Pencarian Google gagal dengan status ${response.status}. (${response.statusText})`;
        try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.error && errorJson.error.message) {
                googleErrorMsg = `Kesalahan API Google: ${errorJson.error.message}`;
            }
        } catch (e) { /* ignore parsing error if not JSON */ }
        
        return { searchResults: `Maaf, terjadi masalah saat menghubungi layanan pencarian Google: ${googleErrorMsg}` };
      }

      const searchData = await response.json();

      if (!searchData.items || searchData.items.length === 0) {
        console.log('[searchInternetTool] No search results found from Google.');
        return { searchResults: `Tidak ada hasil pencarian yang relevan ditemukan di Google untuk "${input.query}".` };
      }

      const resultsSummary = searchData.items
        .slice(0, 3) // Ensure we only take up to 3, though API should respect &num=3
        .map((item: any, index: number) => {
          let summary = `Hasil ${index + 1}: "${item.title || 'Tanpa Judul'}"`;
          if (item.snippet) {
            summary += ` - Cuplikan: ${item.snippet}`;
          }
          if (item.link) {
            summary += ` (Sumber: ${item.link})`;
          }
          return summary;
        })
        .join('\n\n');
      
      const finalSummary = `Berikut adalah ringkasan dari hasil pencarian teratas di Google untuk "${input.query}":\n\n${resultsSummary}`;
      console.log('[searchInternetTool] Returning summarized search results.');
      return { searchResults: finalSummary };

    } catch (error) {
      console.error('[searchInternetTool] Error during Google internet search:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal saat mencari di internet.';
      // Provide a more generic error to the user for network or unexpected issues
      return { searchResults: `Maaf, terjadi kesalahan teknis saat mencoba mencari informasi di internet. Detail: ${errorMessage}` };
    }
  }
);
