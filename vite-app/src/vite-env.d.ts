/// <reference types="vite/client" />

declare module "*.svg" {
  const assetUrl: string;
  export default assetUrl;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
