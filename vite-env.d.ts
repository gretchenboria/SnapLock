/// <reference types="vite/client" />

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  // AI Studio Project IDX / SF specific interface
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  // Polyfill definition for process.env access in browser
  var process: {
    env: {
      API_KEY?: string;
      NODE_ENV?: string;
      [key: string]: string | undefined;
    };
  };

  interface Window {
    aistudio?: AIStudio;
    snaplock?: import('./types').TestHooks;
  }
}
