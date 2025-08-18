/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly PROJECT_ROOT: string; // Declared the new PROJECT_ROOT variable
  readonly GITHUB_CALLBACK_URL: string;
  readonly GOOGLE_CALLBACK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
