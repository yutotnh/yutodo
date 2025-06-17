// 設定ファイル（TOML）の型定義

export interface TodoAppConfig {
  // アプリケーション設定
  app: {
    // ウィンドウ設定
    window: {
      always_on_top: boolean;
      width?: number;
      height?: number;
      min_width?: number;
      min_height?: number;
    };
    // UI設定
    ui: {
      theme: 'auto' | 'light' | 'dark';
      detailed_mode: boolean;
      auto_hide_header: boolean;
      language: 'auto' | 'en' | 'ja';
      current_view: 'tasks' | 'schedules';
    };
    // 動作設定
    behavior: {
      auto_save: boolean;
      enable_shortcuts: boolean;
      show_notifications: boolean;
      confirm_delete: boolean;
    };
  };
  // サーバー設定
  server: {
    url: string;
    timeout?: number;
    retry_attempts?: number;
  };
  // 外観設定
  appearance: {
    custom_css?: string;
    font_family?: string;
    font_size?: number;
  };
  // ショートカット設定
  shortcuts?: {
    new_task?: string;
    toggle_settings?: string;
    focus_search?: string;
    select_all?: string;
    delete_selected?: string;
    show_help?: string;
  };
}

// デフォルト設定
export const DEFAULT_CONFIG: TodoAppConfig = {
  app: {
    window: {
      always_on_top: false,
      width: 800,
      height: 600,
      min_width: 400,
      min_height: 300,
    },
    ui: {
      theme: 'auto',
      detailed_mode: false,
      auto_hide_header: true,
      language: 'auto',
      current_view: 'tasks',
    },
    behavior: {
      auto_save: true,
      enable_shortcuts: true,
      show_notifications: true,
      confirm_delete: true,
    },
  },
  server: {
    url: 'http://localhost:3001',
    timeout: 5000,
    retry_attempts: 3,
  },
  appearance: {
    custom_css: '',
    font_family: 'Inter, sans-serif',
    font_size: 14,
  },
  shortcuts: {
    new_task: 'Ctrl+N',
    toggle_settings: 'Ctrl+,',
    focus_search: 'Ctrl+F',
    select_all: 'Ctrl+A',
    delete_selected: 'Delete',
    show_help: 'F1',
  },
};

// AppSettingsとの互換性のための変換関数
export function configToAppSettings(config: TodoAppConfig) {
  return {
    alwaysOnTop: config.app.window.always_on_top,
    detailedMode: config.app.ui.detailed_mode,
    darkMode: config.app.ui.theme,
    confirmDelete: config.app.behavior.confirm_delete,
    customCss: config.appearance.custom_css || '',
    serverUrl: config.server.url,
    language: config.app.ui.language,
    currentView: config.app.ui.current_view,
  };
}

export function appSettingsToConfig(settings: any, existingConfig: TodoAppConfig = DEFAULT_CONFIG): TodoAppConfig {
  return {
    ...existingConfig,
    app: {
      ...existingConfig.app,
      window: {
        ...existingConfig.app.window,
        always_on_top: settings.alwaysOnTop,
      },
      ui: {
        ...existingConfig.app.ui,
        theme: settings.darkMode,
        detailed_mode: settings.detailedMode,
        language: settings.language,
        current_view: settings.currentView,
      },
      behavior: {
        ...existingConfig.app.behavior,
        confirm_delete: settings.confirmDelete,
      },
    },
    server: {
      ...existingConfig.server,
      url: settings.serverUrl,
    },
    appearance: {
      ...existingConfig.appearance,
      custom_css: settings.customCss,
    },
  };
}