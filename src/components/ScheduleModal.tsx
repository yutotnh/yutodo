import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { X, Calendar, Clock, Repeat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Schedule, ScheduleType, WeeklyConfig, MonthlyConfig, CustomConfig, Priority } from '../types/todo';
import { useWindowDrag } from '../hooks/useWindowDrag';

interface ScheduleModalProps {
  isOpen: boolean;
  schedule?: Schedule | null;
  onClose: () => void;
  onSave: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt' | 'lastExecuted' | 'nextExecution'>) => void;
}

// 日付をYYYY-MM-DD形式の文字列に変換（ローカル時間）
const formatDateToString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  schedule,
  onClose,
  onSave
}) => {
  const { t } = useTranslation();
  
  // Window drag functionality
  const { handleMouseDown: handleHeaderDrag } = useWindowDrag();
  
  // フォームの状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [type, setType] = useState<ScheduleType>('once');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [time, setTime] = useState('09:00');
  const [isActive, setIsActive] = useState(true);
  const [excludeWeekends, setExcludeWeekends] = useState(false);

  // 週次設定
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // デフォルト: 月曜日

  // 月次設定
  const [monthlyType, setMonthlyType] = useState<'date' | 'weekday' | 'lastDay'>('date');
  const [monthlyDate, setMonthlyDate] = useState(1);
  const [monthlyWeekNumber, setMonthlyWeekNumber] = useState(1);
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState(1);
  const [monthlyDaysFromEnd, setMonthlyDaysFromEnd] = useState(1);

  // カスタム設定
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [customMaxOccurrences, setCustomMaxOccurrences] = useState<number | undefined>();

  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // 編集時の初期化
  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title);
      setDescription(schedule.description || '');
      setPriority(schedule.priority);
      setType(schedule.type);
      setStartDate(new Date(schedule.startDate));
      setEndDate(schedule.endDate ? new Date(schedule.endDate) : null);
      setTime(schedule.time || '09:00');
      setIsActive(schedule.isActive);
      setExcludeWeekends(schedule.excludeWeekends || false);

      if (schedule.weeklyConfig) {
        setSelectedDays(schedule.weeklyConfig.daysOfWeek);
      }

      if (schedule.monthlyConfig) {
        setMonthlyType(schedule.monthlyConfig.type);
        setMonthlyDate(schedule.monthlyConfig.date || 1);
        setMonthlyWeekNumber(schedule.monthlyConfig.weekNumber || 1);
        setMonthlyDayOfWeek(schedule.monthlyConfig.dayOfWeek || 1);
        setMonthlyDaysFromEnd(schedule.monthlyConfig.daysFromEnd || 1);
      }

      if (schedule.customConfig) {
        setCustomInterval(schedule.customConfig.interval);
        setCustomUnit(schedule.customConfig.unit);
        setCustomMaxOccurrences(schedule.customConfig.maxOccurrences);
      }
    } else {
      // 新規作成時のリセット
      setTitle('');
      setDescription('');
      setPriority('low');
      setType('once');
      setStartDate(new Date());
      setEndDate(null);
      setTime('09:00');
      setIsActive(true);
      setExcludeWeekends(false);
      setSelectedDays([1]);
      setMonthlyType('date');
      setMonthlyDate(1);
      setMonthlyWeekNumber(1);
      setMonthlyDayOfWeek(1);
      setMonthlyDaysFromEnd(1);
      setCustomInterval(1);
      setCustomUnit('days');
      setCustomMaxOccurrences(undefined);
    }
  }, [schedule, isOpen]);

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    // タイプ別設定の構築
    let weeklyConfig: WeeklyConfig | undefined;
    let monthlyConfig: MonthlyConfig | undefined;
    let customConfig: CustomConfig | undefined;

    switch (type) {
      case 'weekly':
        weeklyConfig = {
          daysOfWeek: selectedDays,
          time: time
        };
        break;
      case 'monthly':
        monthlyConfig = {
          type: monthlyType,
          time: time,
          ...(monthlyType === 'date' && { date: monthlyDate }),
          ...(monthlyType === 'weekday' && { 
            weekNumber: monthlyWeekNumber, 
            dayOfWeek: monthlyDayOfWeek 
          }),
          ...(monthlyType === 'lastDay' && { daysFromEnd: monthlyDaysFromEnd })
        };
        break;
      case 'custom':
        customConfig = {
          interval: customInterval,
          unit: customUnit,
          time: time,
          startDate: startDate ? formatDateToString(startDate) : '',
          ...(endDate && { endDate: formatDateToString(endDate) }),
          ...(customMaxOccurrences && { maxOccurrences: customMaxOccurrences })
        };
        break;
    }

    const scheduleData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      type,
      startDate: startDate ? formatDateToString(startDate) : '',
      endDate: endDate ? formatDateToString(endDate) : undefined,
      time: (type === 'once' || type === 'daily') ? time : undefined,
      weeklyConfig,
      monthlyConfig,
      customConfig,
      excludeWeekends: type === 'daily' ? excludeWeekends : undefined,
      isActive
    };

    onSave(scheduleData);
  };

  const dayNames = [
    t('schedule.dayOfWeek.0'), // 日曜日
    t('schedule.dayOfWeek.1'), // 月曜日
    t('schedule.dayOfWeek.2'), // 火曜日
    t('schedule.dayOfWeek.3'), // 水曜日
    t('schedule.dayOfWeek.4'), // 木曜日
    t('schedule.dayOfWeek.5'), // 金曜日
    t('schedule.dayOfWeek.6')  // 土曜日
  ];

  // オーバーレイクリック処理（タイトルバー除く）
  const handleOverlayClick = (e: React.MouseEvent) => {
    // アプリヘッダー領域（28px + padding = 44px）をクリックした場合はモーダルを閉じない
    if (e.clientY <= 44) {
      return;
    }
    onClose();
  };

  // Enhanced header drag handler that prevents modal closing
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent overlay click handler from firing
    handleHeaderDrag(e);
  }, [handleHeaderDrag]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} data-testid="modal-overlay">
      <div className="modal schedule-modal" onClick={e => e.stopPropagation()} data-testid="modal-content">
        <div className="modal-header" onMouseDown={handleHeaderMouseDown}>
          <h2>
            <Calendar size={20} />
            {schedule ? t('schedule.editSchedule') : t('schedule.createSchedule')}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="schedule-form">
          {/* 基本情報 */}
          <div className="form-section">
            <h3>{t('schedule.basicInfo')}</h3>
            
            <div className="form-group">
              <label htmlFor="schedule-title">{t('schedule.title')}</label>
              <input
                id="schedule-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('schedule.titlePlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="schedule-description">{t('schedule.description')}</label>
              <textarea
                id="schedule-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('schedule.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schedule-priority">{t('schedule.priority')}</label>
                <select
                  id="schedule-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('schedule.active')}</label>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="simple-checkbox"
                />
              </div>
            </div>
          </div>

          {/* スケジュール設定 */}
          <div className="form-section">
            <h3>
              <Repeat size={16} />
              {t('schedule.scheduleSettings')}
            </h3>

            <div className="form-group">
              <label htmlFor="schedule-type">{t('schedule.type')}</label>
              <select
                id="schedule-type"
                value={type}
                onChange={(e) => setType(e.target.value as ScheduleType)}
              >
                <option value="once">{t('schedule.types.once')}</option>
                <option value="daily">{t('schedule.types.daily')}</option>
                <option value="weekly">{t('schedule.types.weekly')}</option>
                <option value="monthly">{t('schedule.types.monthly')}</option>
                <option value="custom">{t('schedule.types.custom')}</option>
              </select>
            </div>

            {/* 開始日 */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schedule-start-date">{t('schedule.startDate')}</label>
                <DatePicker
                  id="schedule-start-date"
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  dateFormat="yyyy/MM/dd"
                  placeholderText="Select start date"
                  className="form-control"
                  required
                />
              </div>

              {type !== 'once' && (
                <div className="form-group">
                  <label htmlFor="schedule-end-date">{t('schedule.endDate')} ({t('schedule.optional')})</label>
                  <DatePicker
                    id="schedule-end-date"
                    selected={endDate}
                    onChange={(date: Date | null) => setEndDate(date)}
                    dateFormat="yyyy/MM/dd"
                    placeholderText="Select end date"
                    className="form-control"
                    isClearable
                    minDate={startDate || undefined}
                  />
                </div>
              )}
            </div>

            {/* 一回限り設定 */}
            {type === 'once' && (
              <div className="form-group">
                <label htmlFor="schedule-time">
                  <Clock size={14} />
                  {t('schedule.time')}
                </label>
                <input
                  id="schedule-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            )}

            {/* 毎日設定 */}
            {type === 'daily' && (
              <div className="form-group">
                <label htmlFor="daily-time">
                  <Clock size={14} />
                  {t('schedule.time')}
                </label>
                <input
                  id="daily-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            )}

            {type === 'daily' && (
              <div className="form-group">
                <label>{t('schedule.excludeWeekends')}</label>
                <input
                  type="checkbox"
                  checked={excludeWeekends}
                  onChange={(e) => setExcludeWeekends(e.target.checked)}
                  className="simple-checkbox"
                />
              </div>
            )}

            {/* 週次設定 */}
            {type === 'weekly' && (
              <div className="form-group">
                <label>{t('schedule.daysOfWeek')}</label>
                <div className="day-selector">
                  {dayNames.map((dayName, index) => (
                    <label key={index} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(index)}
                        onChange={() => handleDayToggle(index)}
                      />
                      <span className="day-label">{dayName}</span>
                    </label>
                  ))}
                </div>
                <div className="form-group">
                  <label htmlFor="weekly-time">
                    <Clock size={14} />
                    {t('schedule.time')}
                  </label>
                  <input
                    id="weekly-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* 月次設定 */}
            {type === 'monthly' && (
              <div className="form-group">
                <label>{t('schedule.monthlyPattern')}</label>
                <div className="monthly-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="date"
                      checked={monthlyType === 'date'}
                      onChange={(e) => setMonthlyType(e.target.value as 'date')}
                    />
                    <span>{t('schedule.monthlyDate')}</span>
                    {monthlyType === 'date' && (
                      <select
                        value={monthlyDate}
                        onChange={(e) => setMonthlyDate(Number(e.target.value))}
                        className="inline-select"
                      >
                        {Array.from({length: 31}, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    )}
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      value="weekday"
                      checked={monthlyType === 'weekday'}
                      onChange={(e) => setMonthlyType(e.target.value as 'weekday')}
                    />
                    <span>{t('schedule.monthlyWeekday')}</span>
                    {monthlyType === 'weekday' && (
                      <div className="inline-controls">
                        <select
                          value={monthlyWeekNumber}
                          onChange={(e) => setMonthlyWeekNumber(Number(e.target.value))}
                          className="inline-select"
                        >
                          <option value={1}>{t('schedule.weekNumber.1')}</option>
                          <option value={2}>{t('schedule.weekNumber.2')}</option>
                          <option value={3}>{t('schedule.weekNumber.3')}</option>
                          <option value={4}>{t('schedule.weekNumber.4')}</option>
                          <option value={-1}>{t('schedule.weekNumber.-1')}</option>
                        </select>
                        <select
                          value={monthlyDayOfWeek}
                          onChange={(e) => setMonthlyDayOfWeek(Number(e.target.value))}
                          className="inline-select"
                        >
                          {dayNames.map((day, index) => (
                            <option key={index} value={index}>{day}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      value="lastDay"
                      checked={monthlyType === 'lastDay'}
                      onChange={(e) => setMonthlyType(e.target.value as 'lastDay')}
                    />
                    <span>{t('schedule.monthlyLastDay')}</span>
                    {monthlyType === 'lastDay' && (
                      <select
                        value={monthlyDaysFromEnd}
                        onChange={(e) => setMonthlyDaysFromEnd(Number(e.target.value))}
                        className="inline-select"
                      >
                        {Array.from({length: 10}, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {t('schedule.daysFromEnd', { days: i + 1 })}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="monthly-time">
                    <Clock size={14} />
                    {t('schedule.time')}
                  </label>
                  <input
                    id="monthly-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* カスタム設定 */}
            {type === 'custom' && (
              <div className="form-group">
                <label>{t('schedule.customInterval')}</label>
                <div className="custom-interval">
                  <span>{t('schedule.every')}</span>
                  <input
                    type="number"
                    min="1"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Number(e.target.value))}
                    className="interval-input"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as 'days' | 'weeks' | 'months')}
                  >
                    <option value="days">{t('schedule.unit.days')}</option>
                    <option value="weeks">{t('schedule.unit.weeks')}</option>
                    <option value="months">{t('schedule.unit.months')}</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="custom-time">
                      <Clock size={14} />
                      {t('schedule.time')}
                    </label>
                    <input
                      id="custom-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="custom-max">{t('schedule.maxOccurrences')} ({t('schedule.optional')})</label>
                    <input
                      id="custom-max"
                      type="number"
                      min="1"
                      value={customMaxOccurrences || ''}
                      onChange={(e) => setCustomMaxOccurrences(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder={t('schedule.unlimited')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary">
              {schedule ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};