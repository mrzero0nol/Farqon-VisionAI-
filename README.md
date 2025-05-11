md
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

Create a `.env` file in the root of your project for local development. This file is used to store environment-specific configurations.

**Important:** When deploying to a hosting service (like Netlify), you will need to configure these environment variables directly in the hosting provider's settings dashboard. Do not commit your `.env` file to version control.

### Firebase Configuration (for Authentication & other Firebase services)

You'll need these for Firebase authentication and potentially other Firebase services. You can find these in your Firebase project settings:
1. Go to the Firebase console (console.firebase.google.com).
2. Select your project.
3. Go to Project settings (click the gear icon).
4. In the "General" tab, under "Your apps", find your web app.
5. The config object will contain these values.

Add them to your `.env` file for local development:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID
```

### Google Custom Search API (for Internet Search Feature) & Genkit Google AI

If you intend to use the internet search functionality provided by the `searchInternetTool` or Genkit's Google AI capabilities (like Gemini models), you will need a Google API Key. For the search tool, you also need a Custom Search Engine ID.

1.  **Enable necessary APIs** in your Google Cloud Console project (e.g., Custom Search API, Generative Language API / Vertex AI API).
2.  **Get a Google API Key**. This key will be used for both Genkit's Google AI models and the Custom Search API.
3.  **Create a Custom Search Engine** and get its ID (CX) if using the `searchInternetTool`. You can configure it to search the entire web.

More details can be found here:
*   [Google Custom Search API Overview](https://developers.google.com/custom-search/v1/overview)
*   [Google AI Gemini API Documentation](https://ai.google.dev/docs)

Once you have your API Key and (if applicable) Search Engine ID, add them to your `.env` file for local development:
```env
GOOGLE_API_KEY=AIzaSyC_AjAWxv8ez_mE9ErqsQs-T2RnZzDQdT8
GOOGLE_CSE_ID=d2bfcc569e7c94c95
```

Replace `AIzaSyC_AjAWxv8ez_mE9ErqsQs-T2RnZzDQdT8` with your actual Google API Key and `d2bfcc569e7c94c95` with your Custom Search Engine ID. The `GOOGLE_API_KEY` is used by Genkit for Google AI models, and both are used by the `searchInternetTool`.

## API Quotas and Rate Limiting

This application uses Google's Generative AI models (like Gemini) via Genkit and potentially the Google Custom Search API. These APIs have usage quotas and rate limits to ensure fair usage and prevent abuse.

If you encounter errors like "429 Too Many Requests", "Resource has been exhausted", or similar quota-related messages, it means your application has exceeded the number of allowed requests to the API within a specific time period.

### Checking Your Quotas

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project.
3.  Navigate to "IAM & Admin" > "Quotas".
4.  Filter for the relevant APIs:
    *   "Generative Language API" (or the specific API used by the Gemini model, e.g., "Vertex AI API" if using Vertex AI endpoints).
    *   "Custom Search API" if you are using the internet search tool.
5.  Review your current usage and limits. Common quotas include requests per minute.

### Requesting a Quota Increase

If you consistently hit your quota limits and require higher throughput, you can request a quota increase:
1.  In the "Quotas" page in Google Cloud Console, select the quota(s) you want to increase.
2.  Click "EDIT QUOTAS".
3.  Fill out the request form with your desired new limit and justification.
4.  Submit the request. Google will review it, and it may take some time to be approved.

### Best Practices

*   **Monitor Usage:** Regularly check your API usage in the Google Cloud Console.
*   **Optimize API Calls:** Ensure your application only makes necessary API calls. Avoid redundant requests.
*   **Implement Retries (with backoff):** For transient errors or rate limiting, consider implementing a retry mechanism with exponential backoff in your application logic. (Note: Genkit or its underlying libraries might handle some level of retries, but for persistent 429 errors, checking quotas is primary.)
*   **Understand Pricing:** Be aware of the pricing model for the APIs you are using to avoid unexpected costs.

## Deployment

### Deploying to Netlify

Netlify offers excellent support for Next.js applications.

1.  **Push your code to a Git repository** (e.g., GitHub, GitLab, Bitbucket).
2.  **Sign up or Log in to Netlify:** Go to [netlify.com](https://www.netlify.com/).
3.  **Create a New Site:**
    *   From your Netlify dashboard, click "Add new site" (or "New site from Git").
    *   Choose "Import an existing project".
4.  **Connect to Your Git Provider:** Select your Git provider and authorize Netlify.
5.  **Select Your Repository:** Choose the repository for this project.
6.  **Configure Build Settings:**
    *   Netlify will usually auto-detect that it's a Next.js project and configure build settings correctly using the `@netlify/plugin-nextjs`.
    *   **Build command:** Should default to `npm run build` or `next build`.
    *   **Publish directory:** Should default to `.next`.
    *   Ensure the `@netlify/plugin-nextjs` is active. If Netlify doesn't add it automatically, you might need to add a `netlify.toml` file (see below).
7.  **Set Environment Variables:**
    *   Before deploying (or after the first deploy), go to your site's settings on Netlify.
    *   Navigate to "Site configuration" > "Build & deploy" > "Environment".
    *   Click "Edit variables" and add the following, ensuring you use your actual values:
        *   `NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyBiU4cHaWta9JpwWr7wd3oN-UnNlwSD5M8"`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="farqon-visionai.firebaseapp.com"`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID="farqon-visionai"`
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="farqon-visionai.firebasestorage.app"`
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="834196735834"`
        *   `NEXT_PUBLIC_FIREBASE_APP_ID="1:834196735834:web:69d9b9e3a0386222c7d563"`
        *   `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-NL64P3Z2Q3"`
        *   `GOOGLE_API_KEY="AIzaSyC_AjAWxv8ez_mE9ErqsQs-T2RnZzDQdT8"` (Crucial for Genkit Google AI models and Google Custom Search)
        *   `GOOGLE_CSE_ID="d2bfcc569e7c94c95"` (Crucial for Google Custom Search tool)
    *   `NEXT_PUBLIC_` prefixed variables are made available client-side. Server-side variables like `GOOGLE_API_KEY` are also handled correctly by Netlify for your Next.js functions.
8.  **Deploy Site:** Click "Deploy site" (or "Trigger deploy" if settings were changed after initial setup). Netlify will build and deploy your application.
9.  **Custom Domain (Optional):** After deployment, you can set up a custom domain in your site's "Domain management" settings on Netlify.

### `netlify.toml` (Optional, but recommended for explicit configuration)

While Netlify often auto-detects Next.js, you can create a `netlify.toml` file in the root of your project for more explicit control:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```
This ensures Netlify uses the correct build command, output directory, and the essential Next.js plugin for features like server-side rendering, API routes, and image optimization.

**Note:** An `.env.example` file can be provided in the repository as a template. Remember to keep your actual `.env` file out of version control.
```
