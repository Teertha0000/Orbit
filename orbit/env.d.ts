/// <reference types="react" />

// FIX: Converted to a module-based global augmentation. This is a more robust way
// to declare global types for custom elements in a modern TypeScript/Vite project.
// The `declare global` block extends existing interfaces, and `export {}` ensures
// this file is treated as a module.

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // FIX: Corrected property name to match project standards (API_KEY).
      API_KEY: string
    }
  }

  // Declare Spline web component for TypeScript/JSX
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.HTMLAttributes<HTMLElement> & {
        url?: string;
        'loading-anim-type'?: string;
      };
    }
  }

  // Electron API types
  interface Window {
    electronAPI?: {
      getApiKey: () => Promise<string>;
      setApiKey: (apiKey: string) => Promise<boolean>;
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
  }
}

// This export statement makes the file a module.
export {};