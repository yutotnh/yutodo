import { SettingsFileError, ParseErrorDetails } from '../types/settings';
import logger from './logger';

export interface AutoFixResult {
  success: boolean;
  fixedContent?: string;
  backupContent?: string;
  fixesApplied?: string[];
  errors?: string[];
}

export interface AutoFixOptions {
  createBackup?: boolean;
  confirmBeforeFix?: boolean;
}

/**
 * Auto-fix utility for common TOML syntax errors
 */
export class TomlAutoFixer {
  
  /**
   * Attempt to automatically fix common TOML syntax errors
   */
  static async autoFix(
    originalContent: string, 
    error: SettingsFileError, 
    options: AutoFixOptions = {}
  ): Promise<AutoFixResult> {
    const { createBackup = true } = options;
    
    try {
      logger.info('Starting TOML auto-fix for error:', error.code);
      
      let fixedContent = originalContent;
      const fixesApplied: string[] = [];
      
      // Apply fixes based on error type and details
      if (error.details) {
        const fixResult = this.applySpecificFixes(fixedContent, error.details);
        fixedContent = fixResult.content;
        fixesApplied.push(...fixResult.fixes);
      }
      
      // Apply general fixes for common TOML issues
      const generalFixResult = this.applyGeneralFixes(fixedContent);
      fixedContent = generalFixResult.content;
      fixesApplied.push(...generalFixResult.fixes);
      
      // Validate that we actually made changes
      if (fixedContent === originalContent) {
        return {
          success: false,
          errors: ['No automatic fixes could be applied to this error.']
        };
      }
      
      // Test parse the fixed content to ensure it's valid
      try {
        const { parse } = await import('@ltd/j-toml');
        parse(fixedContent, { joiner: '\n' });
        logger.info('Auto-fix successful, TOML now parses correctly');
      } catch (parseError) {
        logger.warn('Auto-fixed content still has parsing issues:', parseError);
        return {
          success: false,
          errors: ['Auto-fix applied but file still has syntax errors.']
        };
      }
      
      return {
        success: true,
        fixedContent,
        backupContent: createBackup ? originalContent : undefined,
        fixesApplied
      };
      
    } catch (error) {
      logger.error('Auto-fix process failed:', error);
      return {
        success: false,
        errors: [`Auto-fix failed: ${(error as Error).message}`]
      };
    }
  }
  
  /**
   * Apply fixes based on specific error details
   */
  private static applySpecificFixes(content: string, details: ParseErrorDetails): { content: string; fixes: string[] } {
    let fixedContent = content;
    const fixes: string[] = [];
    
    // Fix escape sequence issues
    if (details.suggestion?.includes('escape')) {
      const escapeFixResult = this.fixEscapeSequences(fixedContent, details);
      fixedContent = escapeFixResult.content;
      fixes.push(...escapeFixResult.fixes);
    }
    
    // Fix quote issues
    if (details.problemText?.includes('quote') || details.suggestion?.includes('quote')) {
      const quoteFixResult = this.fixQuoteIssues(fixedContent, details);
      fixedContent = quoteFixResult.content;
      fixes.push(...quoteFixResult.fixes);
    }
    
    return { content: fixedContent, fixes };
  }
  
  /**
   * Fix invalid escape sequences in TOML strings
   */
  private static fixEscapeSequences(content: string, _details: ParseErrorDetails): { content: string; fixes: string[] } { // eslint-disable-line @typescript-eslint/no-unused-vars
    let fixedContent = content;
    const fixes: string[] = [];
    
    // Common invalid escape sequences in TOML
    const invalidEscapes = [
      { pattern: /\\!/g, replacement: '!', description: 'Remove invalid \\! escape' },
      { pattern: /\\@/g, replacement: '@', description: 'Remove invalid \\@ escape' },
      { pattern: /\\#/g, replacement: '#', description: 'Remove invalid \\# escape' },
      { pattern: /\\&/g, replacement: '&', description: 'Remove invalid \\& escape' },
      { pattern: /\\%/g, replacement: '%', description: 'Remove invalid \\% escape' },
      { pattern: /\\</g, replacement: '<', description: 'Remove invalid \\< escape' },
      { pattern: /\\>/g, replacement: '>', description: 'Remove invalid \\> escape' },
      { pattern: /\\=/g, replacement: '=', description: 'Remove invalid \\= escape' },
      { pattern: /\\;/g, replacement: ';', description: 'Remove invalid \\; escape' },
      { pattern: /\\:/g, replacement: ':', description: 'Remove invalid \\: escape' },
      { pattern: /\\,/g, replacement: ',', description: 'Remove invalid \\, escape' },
      { pattern: /\\\./g, replacement: '.', description: 'Remove invalid \\. escape' },
      { pattern: /\\\?/g, replacement: '?', description: 'Remove invalid \\? escape' }
    ];
    
    // Apply fixes for invalid escapes in string values
    for (const escape of invalidEscapes) {
      if (fixedContent.match(escape.pattern)) {
        fixedContent = fixedContent.replace(escape.pattern, escape.replacement);
        fixes.push(escape.description);
      }
    }
    
    // Specific fix for the common pattern: when = "\!inputFocus"
    if (fixedContent.includes('when = "\\!')) {
      fixedContent = fixedContent.replace(/when = "\\!/g, 'when = "!');
      fixes.push('Fixed when condition escape sequence');
    }
    
    return { content: fixedContent, fixes };
  }
  
  /**
   * Fix quote-related issues
   */
  private static fixQuoteIssues(content: string, _details: ParseErrorDetails): { content: string; fixes: string[] } { // eslint-disable-line @typescript-eslint/no-unused-vars
    let fixedContent = content;
    const fixes: string[] = [];
    
    // Fix mismatched quotes
    const lines = fixedContent.split('\n');
    let hasChanges = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (line.startsWith('#') || line === '') continue;
      
      // Look for key-value pairs with quote issues
      const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (kvMatch) {
        const [, _key, value] = kvMatch; // eslint-disable-line @typescript-eslint/no-unused-vars
        
        // Fix unmatched quotes
        if ((value.startsWith('"') && !value.endsWith('"')) || 
            (!value.startsWith('"') && value.endsWith('"'))) {
          // Try to fix by ensuring both quotes are present
          const cleanValue = value.replace(/^"/, '').replace(/"$/, '');
          lines[i] = lines[i].replace(value, `"${cleanValue}"`);
          fixes.push(`Fixed quote mismatch on line ${i + 1}`);
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      fixedContent = lines.join('\n');
    }
    
    return { content: fixedContent, fixes };
  }
  
  /**
   * Apply general fixes for common TOML formatting issues
   */
  private static applyGeneralFixes(content: string): { content: string; fixes: string[] } {
    let fixedContent = content;
    const fixes: string[] = [];
    
    // Fix trailing whitespace
    if (fixedContent.includes('  \n') || fixedContent.includes('\t\n')) {
      fixedContent = fixedContent.replace(/[ \t]+$/gm, '');
      fixes.push('Removed trailing whitespace');
    }
    
    // Ensure file ends with newline
    if (!fixedContent.endsWith('\n')) {
      fixedContent += '\n';
      fixes.push('Added missing final newline');
    }
    
    // Fix multiple consecutive empty lines
    if (fixedContent.includes('\n\n\n')) {
      fixedContent = fixedContent.replace(/\n{3,}/g, '\n\n');
      fixes.push('Removed excessive empty lines');
    }
    
    // Fix spacing around equals signs
    const spacingPattern = /^(\s*\w+)\s*=\s*(.+)$/gm;
    const spacingMatches = [...fixedContent.matchAll(spacingPattern)];
    if (spacingMatches.length > 0) {
      for (const match of spacingMatches) {
        const [fullMatch, key, value] = match;
        const normalizedKey = key.trim();
        const normalizedValue = value.trim();
        const corrected = `${normalizedKey} = ${normalizedValue}`;
        
        if (fullMatch !== corrected) {
          fixedContent = fixedContent.replace(fullMatch, corrected);
          fixes.push('Normalized spacing around equals sign');
        }
      }
    }
    
    return { content: fixedContent, fixes };
  }
  
  /**
   * Check if a specific error type can be auto-fixed
   */
  static canAutoFix(error: SettingsFileError): boolean {
    // Can auto-fix escape sequence issues
    if (error.details?.suggestion?.includes('escape')) {
      return true;
    }
    
    // Can auto-fix quote issues
    if (error.details?.suggestion?.includes('quote') || 
        error.details?.problemText?.includes('quote')) {
      return true;
    }
    
    // Can auto-fix basic string issues
    if (error.message?.includes('Bad basic string')) {
      return true;
    }
    
    // Conservative approach - only auto-fix known patterns
    return false;
  }
  
  /**
   * Generate a backup filename with timestamp
   */
  static generateBackupFilename(originalPath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = originalPath.endsWith('.toml') ? '.toml' : '';
    const baseName = originalPath.replace(/\.toml$/, '');
    return `${baseName}.backup.${timestamp}${extension}`;
  }
}