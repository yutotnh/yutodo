import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose?: () => void;
  placeholder?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ searchQuery, onSearchChange, onClose, placeholder }, ref) => {
    const { t } = useTranslation();
    const handleClear = () => {
      onSearchChange('');
    };

    return (
      <div className="search-bar">
        <div className="search-input-container">
          <Search size={16} className="search-icon" />
          <input
            ref={ref}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder || t('tasks.search')}
            className="search-input"
            data-testid="search-input"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="search-clear"
              aria-label={t('tasks.clearSearch')}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="search-close"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
);