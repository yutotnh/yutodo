import React, { useState } from 'react';
import { Plus, Calendar, Clock, Repeat, Edit, Trash2, Zap, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Schedule } from '../types/todo';
import { getPriorityText, getPriorityClassSuffix } from '../utils/priorityUtils';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface ScheduleViewProps {
  schedules: Schedule[];
  onCreateSchedule: () => void;
  onEditSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onToggleSchedule: (scheduleId: string) => void;
  onDeleteInactiveSchedules?: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedules,
  onCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onToggleSchedule,
  onDeleteInactiveSchedules
}) => {
  const { t } = useTranslation();
  const [showInactive, setShowInactive] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // スケジュールが実行予定がないかどうかを判定
  const isScheduleInactive = (schedule: Schedule): boolean => {
    if (!schedule.isActive) return true;
    
    const today = new Date().toISOString().split('T')[0];
    
    // 終了日が過去の場合
    if (schedule.endDate && schedule.endDate < today) return true;
    
    // 実行完了したスケジュール（nextExecutionがnull）は非アクティブ
    if (!schedule.nextExecution) {
      // ただし、まだ実行されていない'once'タイプは例外
      if (schedule.type === 'once' && !schedule.lastExecuted) {
        // 開始日が過去の場合のみ非アクティブ
        return schedule.startDate < today;
      }
      // その他のケース（実行完了、endDate到達など）は非アクティブ
      return true;
    }
    
    return false;
  };

  // アクティブと非アクティブなスケジュールに分ける
  const activeSchedules = schedules.filter(schedule => !isScheduleInactive(schedule));
  const inactiveSchedules = schedules.filter(schedule => isScheduleInactive(schedule));

  // 非アクティブスケジュール削除ハンドラー
  const handleDeleteInactiveSchedules = () => {
    if (onDeleteInactiveSchedules) {
      onDeleteInactiveSchedules();
    }
  };


  const formatScheduleDescription = (schedule: Schedule): string => {
    switch (schedule.type) {
      case 'once':
        return `${t('schedule.once')} - ${new Date(schedule.startDate + 'T00:00:00').toLocaleDateString()}`;
      case 'daily':
        return schedule.excludeWeekends 
          ? t('schedule.dailyWeekdays') 
          : t('schedule.daily');
      case 'weekly':
        if (schedule.weeklyConfig?.daysOfWeek) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const days = schedule.weeklyConfig.daysOfWeek.map(day => 
            dayNames[day]
          ).join(', ');
          return `Weekly - ${days}`;
        }
        return t('schedule.weekly');
      case 'monthly':
        if (schedule.monthlyConfig?.type === 'date') {
          return `Monthly - ${schedule.monthlyConfig.date}日`;
        } else if (schedule.monthlyConfig?.type === 'weekday') {
          return `Monthly - ${schedule.monthlyConfig.weekNumber}週目 ${schedule.monthlyConfig.dayOfWeek}曜日`;
        }
        return t('schedule.monthly');
      case 'custom':
        if (schedule.customConfig) {
          return `Custom - ${schedule.customConfig.interval} ${schedule.customConfig.unit}`;
        }
        return t('schedule.custom');
      default:
        return '';
    }
  };

  const getScheduleTypeIcon = (type: string) => {
    switch (type) {
      case 'once': return <Calendar size={14} />;
      case 'daily': return <RefreshCw size={14} />;
      case 'weekly': return <Repeat size={14} />;
      case 'monthly': return <Calendar size={14} />;
      case 'custom': return <Zap size={14} />;
      default: return <Repeat size={14} />;
    }
  };

  const getScheduleTypeColor = (type: string) => {
    switch (type) {
      case 'once': return '#3b82f6';
      case 'daily': return '#10b981';
      case 'weekly': return '#f59e0b';
      case 'monthly': return '#8b5cf6';
      case 'custom': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatNextExecution = (schedule: Schedule): string => {
    if (!schedule.nextExecution) {
      // 手動で非アクティブ化された場合
      if (!schedule.isActive) return t('schedule.inactive');
      
      // 実行完了したスケジュールの場合
      if (schedule.lastExecuted) {
        return t('schedule.completed');
      }
      
      // まだ実行されていないスケジュールの場合、タイプに基づいて次回実行の予測を表示
      switch (schedule.type) {
        case 'once': {
          // サーバー側のロジックと同じ方法で日付を処理
          const timeStr = schedule.time || '09:00';
          const localDateTimeStr = `${schedule.startDate}T${timeStr}:00`;
          const startDateTime = new Date(localDateTimeStr);
          return startDateTime.toLocaleDateString() + (schedule.time ? ` ${schedule.time}` : '');
        }
        case 'daily':
          return t('schedule.nextDay') + (schedule.time ? ` ${schedule.time}` : '');
        case 'weekly':
          return t('schedule.nextWeek') + (schedule.time ? ` ${schedule.time}` : '');
        case 'monthly':
          return t('schedule.nextMonth') + (schedule.time ? ` ${schedule.time}` : '');
        case 'custom':
          return t('schedule.asScheduled') + (schedule.time ? ` ${schedule.time}` : '');
        default:
          return t('schedule.pending');
      }
    }
    
    // Handle the new local datetime format from server
    // Check if it's in local format (YYYY-MM-DDTHH:MM:SS) or UTC format
    let nextDate: Date;
    if (schedule.nextExecution.endsWith('Z') || schedule.nextExecution.includes('+')) {
      // UTC or timezone-aware format - parse normally
      nextDate = new Date(schedule.nextExecution);
    } else {
      // Local datetime format from server - treat as local time
      nextDate = new Date(schedule.nextExecution);
    }
    
    return nextDate.toLocaleDateString() + ' ' + 
           nextDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // スケジュールアイテムをレンダリングする関数
  const renderScheduleItem = (schedule: Schedule) => (
    <div 
      key={schedule.id} 
      className={`schedule-item ${!schedule.isActive ? 'schedule-item--disabled' : ''}`}
      style={{
        borderLeftColor: getScheduleTypeColor(schedule.type),
        borderLeftWidth: '4px'
      }}
    >
      <div className="schedule-item-main">
        <div className="schedule-item-header">
          <div className="schedule-item-title-section">
            <div className="schedule-item-content">
              <div className="schedule-title-with-toggle">
                <h3 className="schedule-item-title">{schedule.title}</h3>
                <div className="schedule-item-toggle">
                  <input
                    type="checkbox"
                    checked={schedule.isActive}
                    onChange={() => onToggleSchedule(schedule.id)}
                    className="schedule-toggle"
                  />
                </div>
              </div>
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
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '0.5rem',
                padding: '0.375rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Edit size={14} />
            </button>
            <button
              className="btn btn--ghost btn--small btn--danger"
              onClick={() => onDeleteSchedule(schedule.id)}
              title={t('schedule.delete')}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '0.5rem',
                padding: '0.375rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="schedule-item-details">
          <div className="schedule-detail">
            <span style={{ color: getScheduleTypeColor(schedule.type) }}>
              {getScheduleTypeIcon(schedule.type)}
            </span>
            <span>{formatScheduleDescription(schedule)}</span>
          </div>
          {schedule.time && (
            <div className="schedule-detail">
              <Clock size={14} className="schedule-detail-icon" />
              <span>{schedule.time}</span>
            </div>
          )}
          {schedule.priority !== 'low' && (
            <div className="schedule-detail">
              <Zap size={14} className="schedule-detail-icon" />
              <span className={`schedule-priority-inline schedule-priority--${getPriorityClassSuffix(schedule.priority)}`}>
                {getPriorityText(schedule.priority)}
              </span>
            </div>
          )}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            return schedule.startDate >= today;
          })() && (
            <div className="schedule-detail">
              <Calendar size={14} className="schedule-detail-icon" />
              <span>{t('schedule.startDate')}: {new Date(schedule.startDate + 'T00:00:00').toLocaleDateString()}</span>
            </div>
          )}
          {schedule.endDate && (
            <div className="schedule-detail">
              <Calendar size={14} className="schedule-detail-icon" />
              <span>{t('schedule.endDate')}: {new Date(schedule.endDate + 'T00:00:00').toLocaleDateString()}</span>
            </div>
          )}
          <div className="schedule-detail">
            <Calendar size={14} className="schedule-detail-icon" />
            <span>{t('schedule.nextExecution')}: {formatNextExecution(schedule)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="schedule-view">
      {/* ヘッダー */}
      <div className="schedule-header">
        <div className="schedule-header-content">
          <h1 className="schedule-title">
            <Calendar className="schedule-title-icon" size={28} />
            {t('schedule.title')}
          </h1>
          <button 
            className="schedule-add-btn"
            onClick={onCreateSchedule}
          >
            <Plus size={18} />
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
          <>
            {/* アクティブなスケジュール */}
            {activeSchedules.length > 0 && (
              <div className="schedule-section">
                <h2 className="schedule-section-title">
                  {t('schedule.activeSchedules')} ({activeSchedules.length})
                </h2>
                {activeSchedules.map(renderScheduleItem)}
              </div>
            )}

            {/* 非アクティブなスケジュール */}
            {inactiveSchedules.length > 0 && (
              <div className="schedule-section">
                <div className="schedule-section-header-row">
                  <button 
                    className="schedule-section-header"
                    onClick={() => setShowInactive(!showInactive)}
                  >
                    <div className="schedule-section-header-content">
                      {showInactive ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <h2 className="schedule-section-title">
                        {t('schedule.inactiveSchedules')} ({inactiveSchedules.length})
                      </h2>
                    </div>
                  </button>
                  {onDeleteInactiveSchedules && (
                    <button
                      className="btn btn--ghost btn--small btn--danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      title={t('schedule.deleteInactiveSchedules')}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.5rem',
                        padding: '0.375rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {showInactive && (
                  <div className="schedule-section-content">
                    {inactiveSchedules.map(renderScheduleItem)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteInactiveSchedules}
        title={t('schedule.deleteInactiveSchedulesConfirm')}
        message={t('schedule.deleteInactiveSchedulesDesc')}
        itemCount={inactiveSchedules.length}
      />
    </div>
  );
};