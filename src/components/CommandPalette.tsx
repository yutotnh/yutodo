import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { CommandAction, CommandContext } from '../types/commands';
import { commandRegistry } from '../utils/commandRegistry';
import { getModifierKey, getShortcutKey } from '../utils/keyboardShortcuts';
import logger from '../utils/logger';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  context: CommandContext;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  context 
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<CommandAction[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      // Get initial commands when opening
      const allCommands = commandRegistry.getAllCommands();
      logger.debug(`CommandPalette: Registry has ${allCommands.length} total commands`);
      
      const commands = commandRegistry.getFilteredCommands('', context);
      setFilteredCommands(commands);
      logger.debug(`CommandPalette opened with ${commands.length} initial commands`);
      
      // Debug: log first few commands
      commands.slice(0, 3).forEach(cmd => {
        logger.debug(`Command: ${cmd.id} - ${cmd.title}`);
      });
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      // Clear state when closing
      setFilteredCommands([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, context.currentView, context.selectedTasks.size]); // contextは意図的に除外（無限ループ防止）

  // Update filtered commands when search query changes
  useEffect(() => {
    const commands = commandRegistry.getFilteredCommands(searchQuery, context);
    setFilteredCommands(commands);
    setSelectedIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, context.currentView, context.selectedTasks.size]); // contextは意図的に除外（無限ループ防止）

  // Execute selected command
  const executeSelectedCommand = useCallback(async () => {
    const command = filteredCommands[selectedIndex];
    if (!command) return;

    try {
      await commandRegistry.executeCommand(command.id, context);
      onClose();
    } catch (error) {
      logger.error('Failed to execute command:', error);
      // Could show error notification here
    }
  }, [filteredCommands, selectedIndex, context, onClose]);

  // Execute command on click
  const executeCommand = useCallback(async (command: CommandAction) => {
    try {
      await commandRegistry.executeCommand(command.id, context);
      onClose();
    } catch (error) {
      logger.error('Failed to execute command:', error);
    }
  }, [context, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        executeSelectedCommand();
        break;
      
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        } else {
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        }
        break;
    }
  }, [filteredCommands, executeSelectedCommand, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      // Find the selected command item by data attribute
      const selectedElement = listRef.current.querySelector(`[data-command-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedElement) {
        const container = listRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = selectedElement.getBoundingClientRect();
        
        const isElementVisible = (
          elementRect.top >= containerRect.top &&
          elementRect.bottom <= containerRect.bottom
        );

        if (!isElementVisible) {
          selectedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }
    }
  }, [selectedIndex]);

  // Command palette outside click detection (excluding title bar)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        // Don't close modal if clicking in the app header area (28px + padding)
        if (event.clientY <= 44) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);



  // Group commands by category
  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, CommandAction[]>);

  const getCategoryLabel = (category: string): string => {
    const categoryLabels: Record<string, string> = {
      file: t('commandPalette.categories.file', 'File'),
      view: t('commandPalette.categories.view', 'View'),
      task: t('commandPalette.categories.task', 'Task'),
      search: t('commandPalette.categories.search', 'Search'),
      settings: t('commandPalette.categories.settings', 'Settings'),
      navigation: t('commandPalette.categories.navigation', 'Navigation')
    };
    return categoryLabels[category] || category;
  };

  // Get dynamic shortcut for command palette from centralized definition
  const commandPaletteShortcut = getShortcutKey('onOpenCommandPalette');
  const modifierKey = getModifierKey();
  const isMac = modifierKey === 'Cmd';
  
  
  

  if (!isOpen) return null;

  return (
    <div 
      className="command-palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('commandPalette.title', 'Command Palette')}
    >
      <div data-testid="command-palette" className="command-palette" ref={paletteRef} onKeyDown={handleKeyDown}>
        {/* Header with search input */}
        <div className="command-palette__header">
          <div className="command-palette__search">
            <Search className="command-palette__search-icon" size={16} />
            <input
              data-testid="command-search"
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('commandPalette.searchPlaceholder', 'Search commands...')}
              className="command-palette__input"
              autoComplete="off"
              spellCheck="false"
            />
            <div className="command-palette__hint">
              <span>{commandPaletteShortcut || (isMac ? '⌘Shift+P' : 'Ctrl+Shift+P')}</span>
            </div>
          </div>
        </div>

        {/* Command list */}
        <div className="command-palette__content" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="command-palette__empty">
              {searchQuery ? 
                t('commandPalette.noResults', 'No commands found') :
                t('commandPalette.noCommands', 'No commands available')
              }
            </div>
          ) : (
            <div className="command-palette__list">
              {Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="command-palette__category">
                  <div className="command-palette__category-header">
                    {getCategoryLabel(category)}
                  </div>
                  {commands.map((command) => {
                    const globalIndex = filteredCommands.indexOf(command);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <div
                        key={command.id}
                        className={`command-palette__item ${isSelected ? 'command-palette__item--selected' : ''}`}
                        onClick={() => executeCommand(command)}
                        role="option"
                        aria-selected={isSelected}
                        data-command-index={globalIndex}
                      >
                        <div className="command-palette__item-content">
                          <div className="command-palette__item-title">
                            {command.title}
                          </div>
                          {command.description && (
                            <div className="command-palette__item-description">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {command.keybinding && (
                          <div className="command-palette__item-keybinding">
                            {command.keybinding}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="command-palette__footer">
          <div className="command-palette__footer-hints">
            <span className="command-palette__hint-group">
              <ArrowUp size={12} />
              <ArrowDown size={12} />
              <span>{t('commandPalette.navigate', 'to navigate')}</span>
            </span>
            <span className="command-palette__hint-group">
              <CornerDownLeft size={12} />
              <span>{t('commandPalette.execute', 'to execute')}</span>
            </span>
            <span className="command-palette__hint-group">
              <span>Esc</span>
              <span>{t('commandPalette.close', 'to close')}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};