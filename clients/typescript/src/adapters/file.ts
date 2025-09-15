// SPDX-License-Identifier: AGPL-3.0-or-later
// File adapter for Mosaic Logger
import * as fs from 'fs';
import * as path from 'path';
import type { LogAdapter, LogEntry, LogLevel } from '../types';
import { EmojiResolver } from '../emoji';

export interface FileAdapterOptions {
  filePath: string;
  enableEmojis?: boolean;
  maxFileSize?: number; // in bytes
  maxBackupFiles?: number;
  rotateOnSize?: boolean;
  rotateDaily?: boolean;
  timestampFormat?: 'iso' | 'short' | 'relative';
  logLevel?: LogLevel;
  emojiResolver?: EmojiResolver;
  bufferSize?: number; // number of entries to buffer before writing
  flushInterval?: number; // milliseconds
}

/**
 * File adapter that writes log entries to a file with optional rotation and buffering
 */
export class FileAdapter implements LogAdapter {
  private options: Required<FileAdapterOptions>;
  private emojiResolver: EmojiResolver;
  private buffer: string[] = [];
  private flushTimer?: NodeJS.Timeout;
  private currentFileSize = 0;
  private writeStream?: fs.WriteStream;

  private static readonly LOG_LEVEL_ORDER: Record<LogLevel, number> = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
  };

  constructor(options: FileAdapterOptions) {
    // Validate required options
    if (!options.filePath) {
      throw new Error('File path is required for FileAdapter');
    }

    this.options = {
      filePath: options.filePath,
      enableEmojis: options.enableEmojis ?? false,
      maxFileSize: options.maxFileSize ?? 100 * 1024 * 1024, // 100MB default
      maxBackupFiles: options.maxBackupFiles ?? 5,
      rotateOnSize: options.rotateOnSize ?? true,
      rotateDaily: options.rotateDaily ?? false,
      timestampFormat: options.timestampFormat ?? 'iso',
      logLevel: options.logLevel ?? 'INFO',
      emojiResolver: options.emojiResolver ?? new EmojiResolver(options.enableEmojis ?? false),
      bufferSize: options.bufferSize ?? 10,
      flushInterval: options.flushInterval ?? 5000, // 5 seconds
    };

    this.emojiResolver = this.options.emojiResolver;
    this.emojiResolver.setEnabled(this.options.enableEmojis);

    // Initialize file system
    this.initializeFile();

    // Only start flush timer if not in test environment
    if (process.env.NODE_ENV !== 'test' && process.env.JEST_WORKER_ID === undefined) {
      this.startFlushTimer();
    }
  }

  /**
   * Write a log entry to the file
   */
  write(entry: LogEntry): void {
    // Coalesce null/undefined level to default 'INFO' before filtering
    const level = entry.level ?? 'INFO';

    // Check if this log entry should be output based on log level
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedEntry = this.formatLogEntry(entry);

    // Add to buffer
    this.buffer.push(formattedEntry);

    // Flush buffer if it's full
    if (this.buffer.length >= this.options.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush any buffered output to disk
   */
  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      this.flushBuffer();
    }

    // Wait for write stream to finish if it exists
    if (this.writeStream) {
      return await new Promise((resolve, reject) => {
        this.writeStream?.once('finish', resolve);
        this.writeStream?.once('error', reject);
      });
    }
  }

  /**
   * Close the adapter and clean up resources
   */
  async close(): Promise<void> {
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush remaining buffer
    await this.flush();

    // Close write stream
    if (this.writeStream) {
      return await new Promise((resolve) => {
        this.writeStream?.end(() => {
          this.writeStream = undefined;
          resolve();
        });
      });
    }
  }

  /**
   * Initialize the file and directory structure
   */
  private initializeFile(): void {
    // Ensure directory exists
    const dir = path.dirname(this.options.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Ensure directory is writable; throws if not
    fs.accessSync(dir, fs.constants.W_OK);

    // Get current file size if file exists
    if (fs.existsSync(this.options.filePath)) {
      const stats = fs.statSync(this.options.filePath);
      this.currentFileSize = stats.size;
    }

    // Check if rotation is needed
    this.checkRotation();

    // Initialize write stream
    this.createWriteStream();
  }

  /**
   * Create or recreate the write stream
   */
  private createWriteStream(): void {
    if (this.writeStream) {
      this.writeStream.destroy();
    }

    this.writeStream = fs.createWriteStream(this.options.filePath, {
      flags: 'a', // append mode
      encoding: 'utf8',
    });

    this.writeStream.on('error', (error) => {
      // eslint-disable-next-line no-console
      console.error('FileAdapter write stream error:', error);
    });
  }

  /**
   * Check if this log entry should be output based on log level
   */
  private shouldLog(level: LogLevel): boolean {
    const entryLevelOrder = FileAdapter.LOG_LEVEL_ORDER[level];
    const configuredLevelOrder = FileAdapter.LOG_LEVEL_ORDER[this.options.logLevel];
    return entryLevelOrder >= configuredLevelOrder;
  }

  /**
   * Format a log entry for file output (JSON format)
   */
  private formatLogEntry(entry: LogEntry): string {
    const logRecord = {
      timestamp: this.formatTimestamp(entry.timestamp ?? new Date()),
      level: entry.level ?? 'INFO',
      service: entry.service ?? 'unknown',
      environment: entry.environment ?? 'unknown',
      message: this.formatMessage(entry),
      logId: entry.logId ?? 'unknown',
      ...(entry.event && { event: entry.event }),
      ...(entry.context && { context: entry.context }),
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.metrics && { metrics: entry.metrics }),
      ...(entry.error && { error: entry.error }),
    };

    return `${JSON.stringify(logRecord)}\n`;
  }

  /**
   * Format message with optional emoji
   */
  private formatMessage(entry: LogEntry): string {
    let message = entry.message ?? '';

    // Respect entry.includeEmoji if set, otherwise fall back to adapter configuration
    const shouldIncludeEmoji = entry.includeEmoji ?? this.options.enableEmojis;
    if (shouldIncludeEmoji && entry.event) {
      message = this.emojiResolver.formatMessage(message, entry.event);
    }

    return message;
  }

  /**
   * Format timestamp according to configuration
   */
  private formatTimestamp(timestamp: Date): string {
    switch (this.options.timestampFormat) {
      case 'iso':
        return timestamp.toISOString();
      case 'short':
        return timestamp.toLocaleString();
      case 'relative': {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        return `+${diff}ms`;
      }
      default:
        return timestamp.toISOString();
    }
  }

  /**
   * Flush the current buffer to disk
   */
  private flushBuffer(): void {
    if (this.buffer.length === 0 || !this.writeStream) {
      return;
    }

    const content = this.buffer.join('');
    this.buffer = [];

    // Write to stream
    this.writeStream.write(content);

    // Update file size tracking
    this.currentFileSize += Buffer.byteLength(content, 'utf8');

    // Check if rotation is needed after writing
    if (this.options.rotateOnSize && this.currentFileSize >= this.options.maxFileSize) {
      this.rotateFile();
    }
  }

  /**
   * Start the automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.options.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushBuffer();
      }, this.options.flushInterval);
    }
  }

  /**
   * Check if file rotation is needed
   */
  private checkRotation(): void {
    if (this.options.rotateDaily) {
      const today = new Date().toISOString().split('T')[0];
      const rotatedFilePath = `${this.options.filePath}.${today}`;

      if (fs.existsSync(rotatedFilePath) && fs.existsSync(this.options.filePath)) {
        // Check if current file was created today
        const stats = fs.statSync(this.options.filePath);
        const fileDate = stats.mtime.toISOString().split('T')[0];

        if (fileDate !== today) {
          this.rotateFile();
        }
      }
    }

    if (this.options.rotateOnSize && this.currentFileSize >= this.options.maxFileSize) {
      this.rotateFile();
    }
  }

  /**
   * Rotate the current log file
   */
  private rotateFile(): void {
    try {
      // Close current write stream
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = undefined;
      }

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.options.filePath}.${timestamp}`;

      // Move current file to backup
      if (fs.existsSync(this.options.filePath)) {
        fs.renameSync(this.options.filePath, backupPath);
      }

      // Clean up old backup files
      this.cleanupOldBackups();

      // Reset file size tracking
      this.currentFileSize = 0;

      // Create new write stream
      this.createWriteStream();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('FileAdapter rotation error:', error);
    }
  }

  /**
   * Clean up old backup files
   */
  private cleanupOldBackups(): void {
    try {
      const dir = path.dirname(this.options.filePath);
      const baseName = path.basename(this.options.filePath);

      // Find all backup files
      const files = fs
        .readdirSync(dir)
        .filter((file) => file.startsWith(`${baseName}.`))
        .map((file) => ({
          name: file,
          path: path.join(dir, file),
          stat: fs.statSync(path.join(dir, file)),
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      // Remove excess backup files
      if (files.length > this.options.maxBackupFiles) {
        const filesToDelete = files.slice(this.options.maxBackupFiles);
        filesToDelete.forEach((file) => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Failed to delete backup file ${file.path}:`, error);
          }
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('FileAdapter cleanup error:', error);
    }
  }

  /**
   * Update adapter options
   */
  updateOptions(options: Partial<FileAdapterOptions>): void {
    // Note: Some options like filePath cannot be changed after initialization
    const updatableOptions = {
      enableEmojis: options.enableEmojis,
      logLevel: options.logLevel,
      bufferSize: options.bufferSize,
      flushInterval: options.flushInterval,
    };

    Object.assign(this.options, updatableOptions);

    if (options.enableEmojis !== undefined) {
      this.emojiResolver.setEnabled(options.enableEmojis);
    }

    if (options.emojiResolver) {
      this.emojiResolver = options.emojiResolver;
    }

    // Restart flush timer if interval changed
    if (options.flushInterval !== undefined) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      this.startFlushTimer();
    }
  }

  /**
   * Get current adapter options
   */
  getOptions(): Required<FileAdapterOptions> {
    return { ...this.options };
  }

  /**
   * Get current file size
   */
  getCurrentFileSize(): number {
    return this.currentFileSize;
  }

  /**
   * Get buffer status
   */
  getBufferStatus(): { size: number; maxSize: number } {
    return {
      size: this.buffer.length,
      maxSize: this.options.bufferSize,
    };
  }
}
