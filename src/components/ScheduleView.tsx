import React from 'react';
import { Plus, Calendar, Clock, Repeat, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Schedule } from '../types/todo';

interface ScheduleViewProps {
  schedules: Schedule[];
  onCreateSchedule: () => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onToggleSchedule: (scheduleId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedules,
  onCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onToggleSchedule
}) => {
  const { t } = useTranslation();

  const formatScheduleDescription = (schedule: Schedule): string => {
    switch (schedule.type) {
      case 'once':
        return `${t('schedule.once')} - ${new Date(schedule.startDate).toLocaleDateString()}`;
      case 'daily':
        return schedule.excludeWeekends 
          ? t('schedule.dailyWeekdays') 
          : t('schedule.daily');
      case 'weekly':
        if (schedule.weeklyConfig?.daysOfWeek) {
          const days = schedule.weeklyConfig.daysOfWeek.map(day => 
            t(`schedule.dayOfWeek.${day}`)
          ).join(', ');
          return `${t('schedule.weekly')} - ${days}`;
        }
        return t('schedule.weekly');
      case 'monthly':
        if (schedule.monthlyConfig?.type === 'date') {
          return `${t('schedule.monthly')} - ${schedule.monthlyConfig.date}${t('schedule.dayOfMonth')}`;
        } else if (schedule.monthlyConfig?.type === 'weekday') {
          return `${t('schedule.monthly')} - ${t('schedule.weekNumber.' + schedule.monthlyConfig.weekNumber)}${t('schedule.dayOfWeek.' + schedule.monthlyConfig.dayOfWeek)}`;
        }
        return t('schedule.monthly');
      case 'custom':
        if (schedule.customConfig) {
          return `${t('schedule.every')} ${schedule.customConfig.interval} ${t('schedule.unit.' + schedule.customConfig.unit)}`;
        }
        return t('schedule.custom');
      default:
        return '';
    }
  };

  const formatNextExecution = (schedule: Schedule): string => {
    if (!schedule.nextExecution) return t('schedule.notScheduled');
    return new Date(schedule.nextExecution).toLocaleDateString() + ' ' + 
           new Date(schedule.nextExecution).toLocaleTimeString();
  };

  return (
    <div className="schedule-view">
      {/* ヘッダー */}
      <div className="schedule-header">
        <div className="schedule-header-content">
          <h1 className="schedule-title">
            <Calendar className="schedule-title-icon" size={24} />
            {t('schedule.title')}
          </h1>
          <button 
            className="btn btn--primary schedule-add-btn"
            onClick={onCreateSchedule}
          >
            <Plus size={16} />
            {t('schedule.addNew')}
          </button>
        </div>
      </div>

      {/* スケジュール一覧 */}
      <div className="schedule-list">
        {schedules.length === 0 ? (
          <div className="schedule-empty">
            <Calendar size={48} className="schedule-empty-icon" />
            <h3>{t('schedule.noSchedules')}</h3>
            <p>{t('schedule.noSchedulesDesc')}</p>
          </div>
        ) : (
          schedules.map(schedule => (
            <div 
              key={schedule.id} 
              className={`schedule-item ${!schedule.isActive ? 'schedule-item--disabled' : ''}`}
            >
              <div className="schedule-item-main">
                <div className="schedule-item-header">
                  <div className="schedule-item-title-section">
                    <div className="schedule-item-toggle">
                      <input
                        type="checkbox"
                        checked={schedule.isActive}
                        onChange={() => onToggleSchedule(schedule.id)}
                        className="schedule-toggle"
                      />
                    </div>
                    <div className="schedule-item-content">
                      <h3 className="schedule-item-title">{schedule.title}</h3>
                      {schedule.description && (
                        <p className="schedule-item-description">{schedule.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="schedule-item-actions">
                    <button
                      className="btn btn--ghost btn--small"
                      onClick={() => onEditSchedule(schedule)}
                      title={t('schedule.edit')}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn--ghost btn--small btn--danger"
                      onClick={() => onDeleteSchedule(schedule.id)}
                      title={t('schedule.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="schedule-item-details">
                  <div className="schedule-detail">
                    <Repeat size={14} className="schedule-detail-icon" />
                    <span>{formatScheduleDescription(schedule)}</span>
                  </div>
                  {schedule.time && (
                    <div className="schedule-detail">
                      <Clock size={14} className="schedule-detail-icon" />
                      <span>{schedule.time}</span>
                    </div>
                  )}
                  <div className="schedule-detail">
                    <Calendar size={14} className="schedule-detail-icon" />
                    <span>{t('schedule.nextExecution')}: {formatNextExecution(schedule)}</span>
                  </div>
                </div>

                {schedule.priority > 0 && (
                  <div className={`schedule-priority schedule-priority--${schedule.priority}`}>
                    {schedule.priority === 2 ? t('priority.high') : t('priority.medium')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};