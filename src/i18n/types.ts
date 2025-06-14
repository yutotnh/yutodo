import type { resources, defaultNS } from './index';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: typeof resources['en'];
  }
}

// Language change utilities
export interface LanguageConfig {
  code: string;
  name: string;
  flag?: string;
}