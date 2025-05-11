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

### Google Custom Search API (for Internet Search Feature)

If you intend to use the internet search functionality provided by the `searchInternetTool`, you will need to set up Google Custom Search API credentials.

1.  **Enable the Custom Search API** in your Google Cloud Console project.
2.  **Get an API Key**.
3.  **Create a Custom Search Engine** and get its ID (CX). You can configure it to search the entire web.

More details can be found here: [Google Custom Search API Overview](https://developers.google.com/custom-search/v1/overview)

Once you have your API Key and Search Engine ID, add them to your `.env` file for local development:
```env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
GOOGLE_CSE_ID=YOUR_GOOGLE_CUSTOM_SEARCH_ENGINE_ID
```

Replace `YOUR_GOOGLE_API_KEY` with your actual Google API Key and `YOUR_GOOGLE_CUSTOM_SEARCH_ENGINE_ID` with your Custom Search Engine ID.

## API Quotas and Rate Limiting

This application uses Google's Generative AI models (like Gemini) via Genkit. These APIs have usage quotas and rate limits to ensure fair usage and prevent abuse.

If you encounter errors like "429 Too Many Requests", "Resource has been exhausted", or similar quota-related messages, it means your application has exceeded the number of allowed requests to the API within a specific time period.

### Checking Your Quotas

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project.
3.  Navigate to "IAM & Admin" > "Quotas".
4.  Filter for the "Generative Language API" (or the specific API used by the Gemini model, e.g., "Vertex AI API" if using Vertex AI endpoints).
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
        "source": ".", // Tells Firebase to look for Next.js output from `next build`
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "frameworksBackend": {
          "region": "us-central1" // Or your preferred region
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
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY" \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN" \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID" \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET" \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID" \
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID" \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID" \
    GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY" \
    GOOGLE_CSE_ID="YOUR_GOOGLE_CSE_ID"
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
7.  **Set Environment Variables:**
    *   In the "Environment variables (advanced)" section of your Cloudflare Pages project settings, add all the necessary environment variables:
        *   `NEXT_PUBLIC_FIREBASE_API_KEY`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
        *   `NEXT_PUBLIC_FIREBASE_APP_ID`
        *   `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (if used)
        *   `GOOGLE_API_KEY`
        *   `GOOGLE_CSE_ID`
    *   **Important:** Ensure you differentiate between "Build environment variables" (available during build) and "Production/Preview environment variables" (available at runtime). `NEXT_PUBLIC_` variables need to be available at build time to be bundled for the client. Server-side variables like `GOOGLE_API_KEY` are needed at runtime. Cloudflare's Next.js adapter usually handles this distinction well.
8.  **Deploy:** Save and Deploy. Cloudflare will build and deploy your site.
9.  **Custom Domain:** After deployment, you can add your custom Cloudflare domain in the "Custom domains" tab of your Pages project settings.

**Note:** An `.env.example` file can be provided in the repository as a template. Remember to keep your actual `.env` file out of version control.
```
