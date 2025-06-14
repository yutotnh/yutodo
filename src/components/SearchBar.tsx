import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ searchQuery, onSearchChange, placeholder = "タスクを検索..." }, ref) => {
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
            placeholder={placeholder}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="search-clear"
              aria-label="検索をクリア"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }
);