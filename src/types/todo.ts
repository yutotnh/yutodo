export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: number;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  order?: number;
}

export interface AppSettings {
  alwaysOnTop: boolean;
  detailedMode: boolean;
  darkMode: 'auto' | 'light' | 'dark';
  confirmDelete: boolean;
  customCss: string;
  serverUrl: string;
}