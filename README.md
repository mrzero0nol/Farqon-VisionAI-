md
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

Create a `.env` file in the root of your project for local development. This file is used to store environment-specific configurations.

**Important:** When deploying to a hosting service (like Firebase Hosting or Cloudflare Pages), you will need to configure these environment variables directly in the hosting provider's settings dashboard. Do not commit your `.env` file to version control.

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

Replace `YOUR_GOOGLE_API_KEY` with your actual Google API Key and `YOUR_GOOGLE_CUSTOM_SEARCH_ENGINE_ID` with your Custom Search Engine ID. The `GOOGLE_API_KEY` is used by Genkit for Google AI models, and both are used by the `searchInternetTool`.

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

### Deploying to Firebase Hosting

1.  **Install Firebase CLI:** If you haven't already, install the Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```
2.  **Login to Firebase:**
    ```bash
    firebase login
    ```
3.  **Initialize Firebase in your project:**
    ```bash
    firebase init hosting
    ```
    *   Select "Use an existing project" and choose your Firebase project.
    *   Set your public directory to `out`. (For Next.js 13+ with App Router, Firebase Hosting will often detect Next.js and configure this correctly. If asked for "public directory", ensure it points to the correct Next.js output, or follow Firebase's specific Next.js deployment guides.)
    *   Configure as a single-page app (SPA): **No** (Next.js handles routing).
    *   Set up automatic builds and deploys with GitHub: Optional, you can set this up.
    *   File `public/index.html` already exists. Overwrite? **No** (if you have a custom one, otherwise Firebase might generate one).

4.  **Configure Rewrites for Next.js (in `firebase.json`):**
    Firebase needs to know how to serve your Next.js app. Your `firebase.json` should look something like this for hosting a static Next.js export:
    ```json
    {
      "hosting": {
        "public": "out",
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "rewrites": [
          {
            "source": "**",
            "destination": "/index.html"
          }
        ]
      }
    }
    ```
    For dynamic Next.js applications using App Router or Pages Router with server-side capabilities, Firebase Hosting typically integrates with Cloud Functions for Firebase or Cloud Run. The `firebase.json` would look more like:
     ```json
    {
      "hosting": {
        "source": ".", 
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "frameworksBackend": {
          "region": "us-central1" 
        }
      }
    }
    ```
    Firebase CLI's `init hosting` with Next.js detection should handle this for you by setting `frameworksBackend`. If you are aiming for a fully static export (`output: 'export'` in `next.config.js`), then the `public: "out"` and rewrites approach is used. Otherwise, `frameworksBackend` is preferred for full Next.js features.

5.  **Build your Next.js app:**
    If you are using `output: 'export'` in `next.config.js`:
    ```bash
    npm run build 
    ```
    This will typically create an `out` directory.
    If you are using the `frameworksBackend` approach (default for full Next.js features):
    ```bash
    npm run build
    ```
    This will create a `.next` directory that Firebase will use.

6.  **Deploy to Firebase Hosting:**
    ```bash
    firebase deploy --only hosting
    ```
7.  **Set Environment Variables in Firebase:**
    Since `.env` files are not deployed, you need to set your environment variables (like Firebase API keys and Google Search API keys) in the Firebase environment. For Cloud Functions for Firebase (which Next.js integrations often use as a backend when `frameworksBackend` is used):
    ```bash
    firebase functions:config:set \
    NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyBiU4cHaWta9JpwWr7wd3oN-UnNlwSD5M8" \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="farqon-visionai.firebaseapp.com" \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="farqon-visionai" \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="farqon-visionai.firebasestorage.app" \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="834196735834" \
    NEXT_PUBLIC_FIREBASE_APP_ID="1:834196735834:web:69d9b9e3a0386222c7d563" \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-NL64P3Z2Q3" \
    GOOGLE_API_KEY="AIzaSyC_AjAWxv8ez_mE9ErqsQs-T2RnZzDQdT8" \
    GOOGLE_CSE_ID="d2bfcc569e7c94c95"
    ```
    Note: `NEXT_PUBLIC_` variables are made available client-side during the build process. Server-side only variables (like `GOOGLE_API_KEY`) need to be handled appropriately. With `frameworksBackend`, Firebase attempts to manage this. Refer to the latest Firebase documentation for deploying Next.js apps. For purely static exports, environment variables used at build time (like `NEXT_PUBLIC_`) are baked into the static files. Runtime server-side variables are not applicable for static exports.

### Deploying to Cloudflare Pages

Cloudflare Pages offers first-class support for Next.js.

1.  **Push your code to a Git repository** (GitHub, GitLab).
2.  **Go to your Cloudflare dashboard.**
3.  Navigate to **Workers & Pages** and click **Create application**.
4.  Select **Pages** and connect your Git provider.
5.  **Select your repository.**
6.  **Configure your build settings:**
    *   **Framework preset:** Select **Next.js**. Cloudflare should automatically detect and configure most settings.
    *   **Build command:** This should typically be `npm run build` or `next build`.
    *   **Build output directory:** For Next.js with App Router, Cloudflare's Next.js preset usually handles this correctly (it's not just a static `out` folder unless you've configured `output: 'export'` in `next.config.js`).
    *   **Routing and `firebase.json`:** Note that the `firebase.json` file is specific to Firebase Hosting. Cloudflare Pages uses its own built-in support and the `@cloudflare/next-on-pages` build utility to handle routing for Next.js applications. You do not need to configure `firebase.json` for Cloudflare Pages. Any custom routing or redirect logic (beyond what Next.js handles inherently) would typically be managed via a `_redirects` file in your project root for Cloudflare Pages.
7.  **Set Environment Variables:**
    *   In the "Environment variables (advanced)" section of your Cloudflare Pages project settings (under "Settings" -> "Environment variables"), add all the necessary environment variables for both "Production" and "Preview" environments if needed:
        *   `NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyBiU4cHaWta9JpwWr7wd3oN-UnNlwSD5M8"`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="farqon-visionai.firebaseapp.com"`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID="farqon-visionai"`
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="farqon-visionai.firebasestorage.app"`
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="834196735834"`
        *   `NEXT_PUBLIC_FIREBASE_APP_ID="1:834196735834:web:69d9b9e3a0386222c7d563"`
        *   `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-NL64P3Z2Q3"`
        *   `GOOGLE_API_KEY="AIzaSyC_AjAWxv8ez_mE9ErqsQs-T2RnZzDQdT8"` (Crucial for Genkit Google AI models and Google Custom Search)
        *   `GOOGLE_CSE_ID="d2bfcc569e7c94c95"` (Crucial for Google Custom Search tool)
    *   **Important:**
        *   `NEXT_PUBLIC_` prefixed variables are generally made available to the client-side during the Next.js build process.
        *   Server-side variables like `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` are used by Genkit flows and tools running on the server (or serverless functions).
        *   Cloudflare's Next.js adapter (`@cloudflare/next-on-pages`) usually handles making these environment variables available correctly to your Next.js application functions at runtime and client-side variables at build time. Ensure you set them in the Cloudflare Pages dashboard for your project.
8.  **Deploy:** Save and Deploy. Cloudflare will build and deploy your site.
9.  **Custom Domain:** After deployment, you can add your custom Cloudflare domain in the "Custom domains" tab of your Pages project settings.

**Note:** An `.env.example` file can be provided in the repository as a template. Remember to keep your actual `.env` file out of version control.
```
