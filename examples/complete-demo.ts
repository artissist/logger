#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later

// Complete demo showcasing all Mosaic Logger features
// Run with: npx ts-node examples/complete-demo.ts

import { LoggerFactory } from '../clients/typescript/src/factory';
import { EmojiResolver } from '../clients/typescript/src/emoji';
import { ContextManager } from '../clients/typescript/src/context';
import { LogEvent } from '../clients/typescript/src/types';

console.log('🚀 Mosaic Logger Complete Demo\n');

// Demo 1: Basic Logger with Emojis
console.log('=== Demo 1: Basic Frontend Logger with Emojis ===');
const frontendLogger = LoggerFactory.createFrontendLogger({
  service: 'demo-frontend',
  environment: 'development',
  emojis: true, // Enable emojis for visual demo
  context: {
    userId: 'demo_user_123',
    sessionId: 'demo_session_abc'
  }
});

frontendLogger.info('Application starting up', { 
  event: 'SYSTEM_START',
  metadata: { component: 'App', version: '1.0.0' }
});

frontendLogger.info('User authenticated successfully', { 
  event: 'USER_AUTH',
  metadata: { method: 'oauth', provider: 'google' }
});

frontendLogger.info('New project created', { 
  event: 'PROJECT_LIFECYCLE',
  metadata: { projectId: 'proj_demo', projectType: 'artwork' }
});

console.log('');

// Demo 2: Backend Logger with File Output
console.log('=== Demo 2: Backend Logger with File Output ===');
const backendLogger = LoggerFactory.createBackendLogger({
  service: 'demo-backend',
  environment: 'development',
  emojis: false, // Typically disabled for backend
  adapters: ['console'], // File adapter would write to disk
  context: {
    correlationId: '12345678-1234-4567-8901-123456789012'
  }
});

backendLogger.info('Database connection established', { 
  event: 'DATABASE_OPERATION',
  metrics: { durationMs: 150, connectionPool: 10 }
});

backendLogger.warn('High memory usage detected', { 
  event: 'WARNING_ISSUED',
  metrics: { memoryBytes: 512 * 1024 * 1024, cpuPercent: 85.5 }
});

console.log('');

// Demo 3: Agent Logger with Processing Context
console.log('=== Demo 3: Agent Logger with Processing Context ===');
const agentLogger = LoggerFactory.createAgentLogger({
  agentId: 'conversation-processor',
  agentType: 'observation',
  environment: 'development',
  emojis: true,
  context: {
    sessionId: 'agent_session_xyz',
    correlationId: '87654321-4321-7654-1098-876543210987'
  }
});

agentLogger.info('Starting observation processing', { 
  event: 'AGENT_PROCESSING',
  metadata: { 
    operation: 'process-observation',
    observationType: 'conversation',
    confidence: 0.92
  }
});

agentLogger.info('Entities extracted successfully', { 
  event: 'AGENT_PROCESSING',
  metadata: { 
    entitiesCount: 5,
    processingTimeMs: 234
  },
  metrics: { durationMs: 234 }
});

console.log('');

// Demo 4: Infrastructure Logger
console.log('=== Demo 4: Infrastructure Logger ===');
const infraLogger = LoggerFactory.createInfrastructureLogger({
  stackName: 'mosaic-demo-stack',
  deploymentId: 'deploy_20250101_123',
  environment: 'development',
  emojis: true
});

infraLogger.info('Stack deployment initiated', { 
  event: 'INFRASTRUCTURE_DEPLOY',
  metadata: { 
    resourcesCount: 15,
    estimatedDuration: '5 minutes'
  }
});

infraLogger.info('Database table created', { 
  event: 'DATABASE_OPERATION',
  metadata: { 
    tableName: 'Projects',
    billingMode: 'PAY_PER_REQUEST'
  }
});

console.log('');

// Demo 5: Error Handling and Performance Metrics
console.log('=== Demo 5: Error Handling and Performance Metrics ===');
try {
  // Simulate an operation that might fail
  const startTime = performance.now();
  
  frontendLogger.trace('Starting complex operation', { 
    event: 'PERFORMANCE_METRIC',
    metadata: { operation: 'complex-calculation' }
  });

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));

  // Simulate an error
  throw new Error('Simulated operation failure');

} catch (error) {
  const duration = performance.now();
  
  frontendLogger.error('Operation failed with error', {
    event: 'ERROR_OCCURRED',
    error: {
      type: error.constructor.name,
      message: error.message,
      stackTrace: error.stack,
      code: 'OPERATION_FAILED',
      context: {
        function: 'complexOperation',
        data: { step: 'processing' }
      }
    },
    metrics: {
      durationMs: Math.round(duration)
    }
  });
}

console.log('');

// Demo 6: Child Loggers and Context Propagation
console.log('=== Demo 6: Child Loggers and Context Propagation ===');
const parentLogger = LoggerFactory.create({
  service: 'demo-parent',
  environment: 'development',
  emojis: true,
  context: {
    correlationId: 'parent-correlation-id',
    userId: 'user_456'
  }
});

// Create child logger with additional context
const childLogger = parentLogger.child({
  requestId: 'req_child_123',
  operation: 'nested-operation'
});

parentLogger.info('Parent operation started', { 
  event: 'API_REQUEST',
  metadata: { endpoint: '/api/demo' }
});

childLogger.info('Child operation processing', { 
  event: 'API_REQUEST',
  metadata: { step: 'validation' }
});

childLogger.info('Child operation completed', { 
  event: 'API_REQUEST',
  metadata: { step: 'response' },
  metrics: { durationMs: 45 }
});

console.log('');

// Demo 7: Custom Events and Emoji Mapping
console.log('=== Demo 7: Custom Events and Emoji Mapping ===');
const customEmojiResolver = new EmojiResolver(true);
customEmojiResolver.addCustomMapping('CUSTOM_CELEBRATION', {
  emoji: '🎉',
  description: 'Custom celebration event',
  isDefault: true
});

const customLogger = LoggerFactory.create({
  service: 'demo-custom',
  environment: 'development',
  emojis: true
});

// Override emoji resolver
customLogger.getEmojiResolver().addCustomMapping('DEMO_EVENT', {
  emoji: '🎯',
  description: 'Demo-specific event',
  isDefault: true
});

// Log with custom event (Note: This would need the event added to LogEvent type)
customLogger.info('Demo completed successfully', {
  metadata: { 
    customEvent: 'DEMO_EVENT',
    totalSteps: 7,
    allTestsPassed: true
  }
});

console.log('');

// Demo 8: Business Metrics and Analytics
console.log('=== Demo 8: Business Metrics and Analytics ===');
frontendLogger.info('User engagement metric', {
  event: 'BUSINESS_METRIC',
  metadata: {
    metric: 'session_duration',
    value: 1800, // 30 minutes
    tags: {
      userType: 'premium',
      feature: 'project_creation'
    }
  }
});

frontendLogger.info('Performance benchmark', {
  event: 'PERFORMANCE_METRIC',
  metrics: {
    durationMs: 150,
    memoryBytes: 1024 * 1024, // 1MB
    cpuPercent: 12.5
  },
  metadata: {
    benchmark: 'page_load_time',
    target: 200,
    achieved: 150
  }
});

console.log('');

// Demo 9: Security and Audit Events
console.log('=== Demo 9: Security and Audit Events ===');
backendLogger.warn('Suspicious login attempt detected', {
  event: 'SECURITY_EVENT',
  metadata: {
    ipAddress: '192.168.1.100',
    userAgent: 'suspicious-bot/1.0',
    attemptCount: 5
  }
});

backendLogger.info('User permission changed', {
  event: 'AUDIT_TRAIL',
  metadata: {
    targetUserId: 'user_789',
    changedBy: 'admin_123',
    oldRole: 'viewer',
    newRole: 'editor',
    reason: 'Project collaboration'
  }
});

console.log('');

// Final summary
console.log('=== Demo Complete ===');
console.log('✅ All Mosaic Logger features demonstrated:');
console.log('   • 25 predefined events with emoji mappings');
console.log('   • Frontend, backend, agent, and infrastructure loggers');
console.log('   • Context propagation and correlation IDs');
console.log('   • Error handling with stack traces');
console.log('   • Performance metrics and timing');
console.log('   • Child loggers with inherited context');
console.log('   • Custom event mappings');
console.log('   • Business metrics and analytics');
console.log('   • Security and audit logging');
console.log('');
console.log('🎉 Mosaic Logger is ready for production use!');

// Cleanup
try {
  await Promise.all([
    frontendLogger.flush(),
    backendLogger.flush(),
    agentLogger.flush(),
    infraLogger.flush(),
    parentLogger.flush(),
    customLogger.flush()
  ]);
  console.log('📝 All loggers flushed successfully');
} catch (error) {
  console.error('❌ Error flushing loggers:', error);
}