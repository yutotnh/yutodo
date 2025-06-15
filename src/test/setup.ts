import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.alert for tests
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true
});

// Mock Tauri API
const mockTauriApi = {
  dialog: {
    save: vi.fn(),
    open: vi.fn(),
    message: vi.fn()
  },
  fs: {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn()
  },
  clipboard: {
    readText: vi.fn(),
    writeText: vi.fn()
  },
  opener: {
    open: vi.fn()
  },
  window: {
    getCurrentWindow: vi.fn(() => ({
      setAlwaysOnTop: vi.fn(),
      minimize: vi.fn(),
      close: vi.fn()
    }))
  }
};

// Mock Tauri modules
vi.mock('@tauri-apps/plugin-dialog', () => mockTauriApi.dialog);
vi.mock('@tauri-apps/plugin-fs', () => mockTauriApi.fs);
vi.mock('@tauri-apps/plugin-clipboard-manager', () => mockTauriApi.clipboard);
vi.mock('@tauri-apps/plugin-opener', () => mockTauriApi.opener);
vi.mock('@tauri-apps/api/window', () => mockTauriApi.window);

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});