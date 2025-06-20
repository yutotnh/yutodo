import { CommandAction, CommandRegistry, CommandContext } from '../types/commands';
import logger from './logger';

class CommandRegistryImpl implements CommandRegistry {
  private _commands = new Map<string, CommandAction>();

  register(command: CommandAction): void {
    if (this._commands.has(command.id)) {
      logger.warn(`Command with id "${command.id}" is already registered. Overwriting.`);
    }
    this._commands.set(command.id, command);
    logger.debug(`Registered command: ${command.id}`);
  }

  unregister(commandId: string): void {
    const removed = this._commands.delete(commandId);
    if (removed) {
      logger.debug(`Unregistered command: ${commandId}`);
    } else {
      logger.warn(`Attempted to unregister non-existent command: ${commandId}`);
    }
  }

  getCommand(commandId: string): CommandAction | undefined {
    return this._commands.get(commandId);
  }

  getAllCommands(): CommandAction[] {
    return Array.from(this._commands.values());
  }

  getFilteredCommands(query: string, context?: CommandContext): CommandAction[] {
    const normalizedQuery = query.toLowerCase().trim();
    const allCommands = this.getAllCommands();
    
    logger.debug(`CommandRegistry: ${allCommands.length} total commands registered`);
    
    if (!normalizedQuery) {
      // Return all visible and enabled commands when no query
      const filteredCommands = allCommands
        .filter(cmd => this.isCommandVisible(cmd, context))
        .filter(cmd => this.isCommandEnabled(cmd, context))
        .sort((a, b) => this.compareCommands(a, b));
      
      logger.debug(`CommandRegistry: ${filteredCommands.length} commands after filtering (no query)`);
      return filteredCommands;
    }

    const searchResults = allCommands
      .filter(cmd => this.isCommandVisible(cmd, context))
      .filter(cmd => this.isCommandEnabled(cmd, context))
      .filter(cmd => this.matchesQuery(cmd, normalizedQuery))
      .sort((a, b) => this.scoreCommand(b, normalizedQuery) - this.scoreCommand(a, normalizedQuery));
    
    logger.debug(`CommandRegistry: ${searchResults.length} commands after search for "${normalizedQuery}"`);
    return searchResults;
  }

  async executeCommand(commandId: string, context: CommandContext, ...args: any[]): Promise<void> {
    const command = this.getCommand(commandId);
    
    if (!command) {
      logger.error(`Command not found: ${commandId}`);
      throw new Error(`Command not found: ${commandId}`);
    }

    if (!this.isCommandEnabled(command)) {
      logger.warn(`Command is disabled: ${commandId}`);
      return;
    }

    try {
      logger.info(`Executing command: ${commandId}`);
      await Promise.resolve(command.execute.call(null, context, ...args));
      logger.debug(`Command executed successfully: ${commandId}`);
    } catch (error) {
      logger.error(`Error executing command ${commandId}:`, error);
      throw error;
    }
  }

  private isCommandVisible(command: CommandAction, context?: CommandContext): boolean {
    return command.isVisible ? command.isVisible(context) : true;
  }

  private isCommandEnabled(command: CommandAction, context?: CommandContext): boolean {
    return command.isEnabled ? command.isEnabled(context) : true;
  }

  private matchesQuery(command: CommandAction, query: string): boolean {
    const searchText = [
      command.title,
      command.description || '',
      ...(command.keywords || [])
    ].join(' ').toLowerCase();

    // Fuzzy matching - check if all query characters appear in order
    const queryChars = query.split('');
    let searchIndex = 0;

    for (const char of queryChars) {
      const foundIndex = searchText.indexOf(char, searchIndex);
      if (foundIndex === -1) {
        return false;
      }
      searchIndex = foundIndex + 1;
    }

    return true;
  }

  private scoreCommand(command: CommandAction, query: string): number {
    let score = 0;
    const title = command.title.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact title match gets highest score
    if (title === queryLower) {
      score += 1000;
    }
    // Title starts with query gets high score
    else if (title.startsWith(queryLower)) {
      score += 500;
    }
    // Title contains query gets medium score
    else if (title.includes(queryLower)) {
      score += 100;
    }

    // Keywords match gets additional score
    if (command.keywords) {
      for (const keyword of command.keywords) {
        if (keyword.toLowerCase().includes(queryLower)) {
          score += 50;
        }
      }
    }

    // Description match gets small score
    if (command.description && command.description.toLowerCase().includes(queryLower)) {
      score += 25;
    }

    return score;
  }

  private compareCommands(a: CommandAction, b: CommandAction): number {
    // Sort by category first, then by title
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.title.localeCompare(b.title);
  }

  get commands(): Map<string, CommandAction> {
    return new Map(this._commands);
  }
}

// Singleton instance
export const commandRegistry = new CommandRegistryImpl();