import { forwardRef, useState, useEffect } from 'react';
import { Search, X, CaseSensitive, Regex, WholeWord } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchSettings } from '../types/todo';
import { getShortcutKey } from '../utils/keyboardShortcuts';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchSettings: SearchSettings;
  onSearchSettingsChange: (settings: SearchSettings) => void;
  onClose?: () => void;
  placeholder?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ searchQuery, onSearchChange, searchSettings, onSearchSettingsChange, onClose, placeholder }, ref) => {
    const { t } = useTranslation();
    const [regexError, setRegexError] = useState<string | null>(null);
    
    // 正規表現の検証
    useEffect(() => {
      if (searchSettings.useRegex && searchQuery) {
        try {
          new RegExp(searchQuery);
          setRegexError(null);
        } catch {
          setRegexError(t('search.invalidRegex'));
        }
      } else {
        setRegexError(null);
      }
    }, [searchQuery, searchSettings.useRegex, t]);
    
    const handleClear = () => {
      onSearchChange('');
      setRegexError(null);
    };

    const toggleCaseSensitive = () => {
      onSearchSettingsChange({
        ...searchSettings,
        caseSensitive: !searchSettings.caseSensitive
      });
    };

    const toggleRegex = () => {
      onSearchSettingsChange({
        ...searchSettings,
        useRegex: !searchSettings.useRegex
      });
    };

    const toggleWholeWord = () => {
      onSearchSettingsChange({
        ...searchSettings,
        wholeWord: !searchSettings.wholeWord
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Esc: 検索を非表示
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
      // Note: Alt+C, Alt+R, Alt+W are now handled by the global keyboard shortcuts system
      // and can be customized in keybindings.toml
    };

    return (
      <div className="search-bar">
        <div className="search-input-wrapper">
          <div className={`search-input-container ${regexError ? 'search-input-container--error' : ''}`}>
            <Search size={16} className="search-icon" />
            <input
              ref={ref}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || t('tasks.search')}
              className="search-input"
              data-testid="search-input"
              aria-invalid={!!regexError}
              aria-describedby={regexError ? 'search-error' : undefined}
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
          
          <div className="search-options">
            <button
              onClick={toggleCaseSensitive}
              className={`search-option ${searchSettings.caseSensitive ? 'search-option--active' : ''}`}
              aria-label={t('search.caseSensitive')}
              title={`${t('search.caseSensitive')} (${getShortcutKey('onToggleCaseSensitive') || 'Alt+C'})`}
              data-testid="search-case-sensitive"
            >
              <CaseSensitive size={14} />
            </button>
            
            <button
              onClick={toggleRegex}
              className={`search-option ${searchSettings.useRegex ? 'search-option--active' : ''} ${regexError ? 'search-option--error' : ''}`}
              aria-label={t('search.useRegex')}
              title={`${t('search.useRegex')} (${getShortcutKey('onToggleRegex') || 'Alt+R'})`}
              data-testid="search-regex"
            >
              <Regex size={14} />
            </button>
            
            <button
              onClick={toggleWholeWord}
              className={`search-option ${searchSettings.wholeWord ? 'search-option--active' : ''}`}
              aria-label={t('search.wholeWord')}
              title={`${t('search.wholeWord')} (${getShortcutKey('onToggleWholeWord') || 'Alt+W'})`}
              data-testid="search-whole-word"
            >
              <WholeWord size={14} />
            </button>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="search-close"
            aria-label={t('buttons.close')}
            title={t('buttons.close')}
          >
            <X size={16} />
          </button>
        )}
        
        {regexError && (
          <div id="search-error" className="search-error" role="alert">
            {regexError}
          </div>
        )}
      </div>
    );
  }
);