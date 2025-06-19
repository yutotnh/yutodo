// Priority type definition - supports both legacy numbers and new strings
export type Priority = 'low' | 'medium' | 'high' | number;

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority; // Changed from number to Priority (with backward compatibility)
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  order?: number;
  scheduleId?: string; // スケジュールから自動生成されたタスクの場合
}

export interface AppSettings {
  alwaysOnTop: boolean;
  detailedMode: boolean;
  darkMode: 'auto' | 'light' | 'dark';
  confirmDelete: boolean;
  customCss: string;
  serverUrl: string;
  language: 'auto' | 'en' | 'ja';
  currentView: 'tasks' | 'schedules'; // 現在のビュー状態
}

// スケジュール関連の型定義
export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface WeeklyConfig {
  daysOfWeek: number[]; // 0=日曜日, 1=月曜日, ... 6=土曜日
  time?: string; // HH:MM形式
}

export interface MonthlyConfig {
  type: 'date' | 'weekday' | 'lastDay';
  date?: number; // 月の日付 (1-31)
  weekNumber?: number; // 第何週 (1-4, -1=最終週)
  dayOfWeek?: number; // 曜日 (0-6)
  daysFromEnd?: number; // 月末から何日前
  time?: string;
}

export interface CustomConfig {
  interval: number; // 間隔
  unit: 'days' | 'weeks' | 'months'; // 単位
  time?: string;
  startDate?: string; // 開始日
  endDate?: string; // 終了日 (オプション)
  maxOccurrences?: number; // 最大実行回数 (オプション)
}

export interface Schedule {
  id: string;
  title: string;
  description?: string;
  priority: Priority; // Changed from number to Priority
  type: ScheduleType;
  
  // スケジュール設定
  startDate: string; // 開始日
  endDate?: string; // 終了日 (オプション)
  time?: string; // 実行時刻 (HH:MM)
  
  // タイプ別設定
  weeklyConfig?: WeeklyConfig;
  monthlyConfig?: MonthlyConfig;
  customConfig?: CustomConfig;
  
  // 除外設定
  excludeWeekends?: boolean;
  excludeDates?: string[]; // 除外する特定の日付
  
  // メタデータ
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecuted?: string; // 最後に実行された日時
  nextExecution?: string; // 次回実行予定日時
}