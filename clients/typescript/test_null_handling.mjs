import { ConsoleAdapter } from '../src/adapters/console.js';
import { FileAdapter } from '../src/adapters/file.js';

console.log('Testing adapters with various null/undefined fields...');

// Test entry with various null/undefined fields
const testEntry = {
  logId: null,
  timestamp: null, 
  level: 'INFO',
  message: null,
  service: null,
  environment: null,
  event: null,
  includeEmoji: null,
  context: null,
  metadata: null,
  metrics: null,
  error: null,
};

console.log('Creating adapters...');
const consoleAdapter = new ConsoleAdapter();
const fileAdapter = new FileAdapter({ filePath: '/tmp/test.log' });

console.log('Testing ConsoleAdapter with null fields...');
try {
  consoleAdapter.write(testEntry);
  console.log('✓ ConsoleAdapter handled null fields');
} catch (error) {
  console.error('✗ ConsoleAdapter failed:', error);
}

console.log('Testing FileAdapter with null fields...');
try {
  fileAdapter.write(testEntry);
  console.log('✓ FileAdapter handled null fields');
} catch (error) {
  console.error('✗ FileAdapter failed:', error);
}

// Test with undefined fields
const testEntryUndefined = {
  logId: undefined,
  timestamp: undefined,
  level: 'WARN', 
  message: undefined,
  service: undefined,
  environment: undefined,
  event: undefined,
  includeEmoji: undefined,
  context: undefined,
  metadata: undefined,
  metrics: undefined,
  error: undefined,
};

console.log('Testing ConsoleAdapter with undefined fields...');
try {
  consoleAdapter.write(testEntryUndefined);
  console.log('✓ ConsoleAdapter handled undefined fields');
} catch (error) {
  console.error('✗ ConsoleAdapter failed:', error);
}

console.log('Testing FileAdapter with undefined fields...');
try {
  fileAdapter.write(testEntryUndefined);
  console.log('✓ FileAdapter handled undefined fields');
} catch (error) {
  console.error('✗ FileAdapter failed:', error);
}

console.log('Cleaning up...');
await fileAdapter.close();