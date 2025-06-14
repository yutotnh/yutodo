import React from 'react';
import { Filter, CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react';

export type FilterType = 'all' | 'completed' | 'pending' | 'overdue' | 'high' | 'medium' | 'low';

interface TodoFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
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

export const TodoFilter: React.FC<TodoFilterProps> = ({ currentFilter, onFilterChange, counts }) => {
  const filters = [
    { key: 'all' as FilterType, label: 'すべて', icon: Filter, count: counts.all },
    { key: 'pending' as FilterType, label: '未完了', icon: Circle, count: counts.pending },
    { key: 'completed' as FilterType, label: '完了済み', icon: CheckCircle, count: counts.completed },
    { key: 'overdue' as FilterType, label: '期限切れ', icon: AlertTriangle, count: counts.overdue },
    { key: 'high' as FilterType, label: '高優先度', icon: AlertTriangle, count: counts.high },
    { key: 'medium' as FilterType, label: '中優先度', icon: Clock, count: counts.medium },
    { key: 'low' as FilterType, label: '低優先度', icon: Circle, count: counts.low }
  ];

  return (
    <div className="todo-filter">
      <h3 className="filter-title">
        <Filter size={16} />
        フィルター
      </h3>
      <div className="filter-buttons">
        {filters.map(filter => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={`filter-btn ${currentFilter === filter.key ? 'filter-btn--active' : ''}`}
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