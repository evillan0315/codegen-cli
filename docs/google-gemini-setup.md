# Google Gemini API Key Setup (for Backend Service)

**Important:** The AI Editor CLI tool *does not directly* use the Google Gemini API key. Instead, it relies on a separate backend service (e.g., a NestJS application) which in turn communicates with the Gemini API. Therefore, the Gemini API key must be configured on your **backend server**, not in the CLI's environment.

This guide explains how to obtain a Google Gemini API key, which your backend service will require to interact with Gemini models. By default, the backend is expected to use the `gemini-1.5-pro-latest` model.

## 1. Go to Google AI Studio or Google Cloud Console

You have two main options to get an API key:

*   **Google AI Studio (Recommended for quick start):** This is the easiest way to get an API key for development and experimenting with generative AI models. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
*   **Google Cloud Console:** If you need more control, project management, or intend to use other Google Cloud services, use the [Google Cloud Console](https://console.cloud.google.com/).

### Option A: Using Google AI Studio

1.  Navigate to [Google AI Studio API Key page](https://aistudio.google.com/app/apikey).
2.  Sign in with your Google account.
3.  If this is your first time, you might be prompted to create a new project. Follow the on-screen instructions.
4.  Once on the API Key page, click **"Get API key in new project"** or **"Create API key in existing project"**.
5.  A new API key will be generated. Copy this key immediately as you won't be able to see it again.

### Option B: Using Google Cloud Console

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Create a new project (if you don't have one):**
    *   Click on the project selector dropdown at the top.
    *   Click **"New Project"**.
    *   Give your project a name (e.g., "AI Editor Project") and click **"Create"**.
    *   Select your newly created project.
3.  **Enable the Gemini API:**
    *   In the search bar at the top, type "Generative Language API" and select it.
    *   Click the **"Enable"** button if it's not already enabled.
4.  **Create an API key:**
    *   In the Cloud Console, navigate to **"APIs & Services" > "Credentials"** (or use the search bar to find "Credentials").
    *   Click **"+ CREATE CREDENTIALS"** at the top and select **"API key"**.
    *   A new API key will be generated and displayed. Copy this key immediately.
    *   **Important:** Restrict your API key for security best practices. You can restrict it by API (Generative Language API) and by IP address or HTTP referrer if this is for a specific server-side application.

## 2. Configure the API Key on Your Backend Service

The AI Editor backend service (e.g., NestJS application) expects your Google Gemini API key to be available as an environment variable named `GOOGLE_GEMINI_API_KEY`.

**Example: Using a `.env` file for your backend (recommended for local development):**

In the root directory of your backend project (where its `package.json` is located), create a file named `.env` and add your API key there:

```
GOOGLE_GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

Replace `"YOUR_API_KEY_HERE"` with the actual API key you obtained. This method is convenient for local development as it keeps your API key out of version control (if `.env` is in `.gitignore`, which it should be).

For production deployments, consult your backend framework's documentation or deployment platform's guidelines for securely managing environment variables.

---

Now, your backend service should be able to access your Google Gemini API key and respond to AI Editor CLI requests.
