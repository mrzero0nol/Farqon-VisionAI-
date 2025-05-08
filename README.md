# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

Create a `.env` file in the root of your project. This file is used to store environment-specific configurations.

### Google Custom Search API (for Internet Search Feature)

If you intend to use the internet search functionality provided by the `searchInternetTool`, you will need to set up Google Custom Search API credentials.

1.  **Enable the Custom Search API** in your Google Cloud Console project.
2.  **Get an API Key**.
3.  **Create a Custom Search Engine** and get its ID (CX). You can configure it to search the entire web.

More details can be found here: [Google Custom Search API Overview](https://developers.google.com/custom-search/v1/overview)

Once you have your API Key and Search Engine ID, add them to your `.env` file:

```env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
GOOGLE_CSE_ID=YOUR_GOOGLE_CUSTOM_SEARCH_ENGINE_ID
```

Replace `YOUR_GOOGLE_API_KEY` with your actual Google API Key and `YOUR_GOOGLE_CUSTOM_SEARCH_ENGINE_ID` with your Custom Search Engine ID.

**Note:** An `.env.example` file is provided in the repository. You can copy it to `.env` and fill in your values. Remember to keep your `.env` file out of version control as it contains sensitive credentials.
