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
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID (Optional, for Analytics)
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
    *   Set your public directory to `.next`. (For Next.js 13+ with App Router, Firebase Hosting will often detect Next.js and configure this correctly. If asked for "public directory", ensure it points to the correct Next.js output, or follow Firebase's specific Next.js deployment guides.)
    *   Configure as a single-page app (SPA): **No** (Next.js handles routing).
    *   Set up automatic builds and deploys with GitHub: Optional, you can set this up.
    *   File `public/index.html` already exists. Overwrite? **No** (if you have a custom one, otherwise Firebase might generate one).

4.  **Configure Rewrites for Next.js (in `firebase.json`):**
    Firebase needs to know how to serve your Next.js app. Your `firebase.json` should look something like this:
    ```json
    {
      "hosting": {
        "source": ".", // Tells Firebase to look for Next.js output
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
    Firebase CLI's `init hosting` with Next.js detection should handle this for you. If not, you might need to set `hosting.public` to something like `out` if you were using `next export`, but for App Router, the `source` and `frameworksBackend` approach is preferred.

5.  **Build your Next.js app:**
    ```bash
    npm run build
    ```
6.  **Deploy to Firebase Hosting:**
    ```bash
    firebase deploy --only hosting
    ```
7.  **Set Environment Variables in Firebase:**
    Since `.env` files are not deployed, you need to set your environment variables (like Firebase API keys and Google Search API keys) in the Firebase environment. For Cloud Functions for Firebase (which Next.js integrations often use as a backend):
    ```bash
    firebase functions:config:set \
    firebase.api_key="YOUR_FIREBASE_API_KEY" \
    firebase.auth_domain="YOUR_FIREBASE_AUTH_DOMAIN" \
    # ... and so on for all your NEXT_PUBLIC_FIREBASE_ keys
    google.api_key="YOUR_GOOGLE_API_KEY" \
    google.cse_id="YOUR_GOOGLE_CSE_ID"
    ```
    Note: `NEXT_PUBLIC_` variables are available client-side. Server-side only variables (like `GOOGLE_API_KEY`) need to be handled appropriately. With `frameworksBackend`, Firebase tries to manage this. Refer to the latest Firebase documentation for deploying Next.js apps.

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
    *   **Build output directory:** For Next.js with App Router, Cloudflare's Next.js preset usually handles this correctly (it's not just a static `out` folder).
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