import React from 'react';
import { Filter, CheckCircle, Circle, Clock, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type FilterType = 'all' | 'completed' | 'pending' | 'overdue' | 'high' | 'medium' | 'low';

interface TodoFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onClose?: () => void;
  counts: {
    all: number;
    completed: number;
    pending: number;
    overdue: number;
    high: number;
    medium: number;
    low: number;
  };
}

export const TodoFilter: React.FC<TodoFilterProps> = ({ currentFilter, onFilterChange, onClose, counts }) => {
  const { t } = useTranslation();
  
  const filters = [
    { key: 'all' as FilterType, label: t('filters.all'), icon: Filter, count: counts.all },
    { key: 'pending' as FilterType, label: t('filters.pending'), icon: Circle, count: counts.pending },
    { key: 'completed' as FilterType, label: t('filters.completed'), icon: CheckCircle, count: counts.completed },
    { key: 'overdue' as FilterType, label: t('filters.overdue'), icon: AlertTriangle, count: counts.overdue },
    { key: 'high' as FilterType, label: t('filters.highPriority'), icon: AlertTriangle, count: counts.high },
    { key: 'medium' as FilterType, label: t('filters.mediumPriority'), icon: Clock, count: counts.medium },
    { key: 'low' as FilterType, label: t('filters.lowPriority'), icon: Circle, count: counts.low }
  ];

  return (
    <div className="todo-filter">
      <div className="filter-header">
        <h3 className="filter-title">
          <Filter size={16} />
          {t('filters.title')}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="filter-close"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="filter-buttons">
        {filters.map(filter => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={`filter-btn ${currentFilter === filter.key ? 'filter-btn--active' : ''}`}
              data-testid={`filter-${filter.key}`}
            >
              <Icon size={14} />
              <span>{filter.label}</span>
              <span className="filter-count">{filter.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};