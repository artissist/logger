// SPDX-License-Identifier: AGPL-3.0-or-later
// Frontend integration example for Next.js with Artissist Logger
import React, { useEffect, useState } from 'react';
import { LoggerFactory, Logger } from '@artissist/logger';

// Initialize logger for frontend application
const logger = LoggerFactory.createFrontendLogger({
  service: 'artissist-frontend',
  environment: process.env.NODE_ENV || 'development',
  emojis: process.env.NODE_ENV === 'development', // Enable emojis in development
  context: {
    userId: 'user_123', // Would come from auth context
    sessionId: 'sess_abc123'
  },
  adapters: ['console'],
  level: 'INFO'
});

// Example React component using the logger
export default function ProjectCreationPage() {
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Log page view
    logger.info('Project creation page loaded', {
      event: 'ANALYTICS_EVENT',
      metadata: {
        component: 'ProjectCreationPage',
        operation: 'page-view',
        tags: { page: '/projects/create' }
      }
    });

    // Load existing projects
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const startTime = performance.now();

    logger.debug('Loading user projects', {
      event: 'API_REQUEST',
      metadata: { operation: 'load-projects' }
    });

    try {
      const response = await fetch('/api/projects');
      const projectData = await response.json();

      setProjects(projectData);

      logger.info('Projects loaded successfully', {
        event: 'API_REQUEST',
        metrics: {
          durationMs: performance.now() - startTime,
          memoryBytes: getMemoryUsage()
        },
        metadata: {
          operation: 'load-projects',
          data: { projectCount: projectData.length }
        }
      });

    } catch (error) {
      logger.error('Failed to load projects', {
        event: 'ERROR_OCCURRED',
        error: {
          type: error.constructor.name,
          message: error.message,
          code: 'PROJECT_LOAD_FAILED'
        },
        metrics: {
          durationMs: performance.now() - startTime
        }
      });
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      logger.warn('Project creation attempted with empty name', {
        event: 'WARNING_ISSUED',
        metadata: {
          operation: 'create-project',
          component: 'ProjectCreationPage'
        }
      });
      return;
    }

    setIsCreating(true);
    const startTime = performance.now();

    // Create child logger for this operation with additional context
    const operationLogger = logger.child({
      correlationId: generateCorrelationId(),
      requestId: `req_${Date.now()}`
    });

    operationLogger.info('Project creation initiated', {
      event: 'PROJECT_LIFECYCLE',
      metadata: {
        operation: 'create-project',
        data: { projectName, projectType: 'artwork' }
      }
    });

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Propagate correlation context
          ...operationLogger.getContext()
        },
        body: JSON.stringify({
          name: projectName,
          type: 'artwork',
          description: 'New art project'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newProject = await response.json();
      setProjects(prev => [...prev, newProject]);
      setProjectName('');

      operationLogger.info('Project created successfully', {
        event: 'PROJECT_LIFECYCLE',
        metadata: {
          operation: 'create-project',
          data: {
            projectId: newProject.id,
            projectName: newProject.name
          }
        },
        metrics: {
          durationMs: performance.now() - startTime,
          memoryUsed: getMemoryUsage()
        }
      });

      // Track business metric
      logger.info('New project created', {
        event: 'BUSINESS_METRIC',
        metadata: {
          metric: 'project_created',
          value: 1,
          tags: {
            projectType: 'artwork',
            userTier: 'free' // Would come from user context
          }
        }
      });

    } catch (error) {
      operationLogger.error('Project creation failed', {
        event: 'ERROR_OCCURRED',
        error: {
          type: error.constructor.name,
          message: error.message,
          code: 'PROJECT_CREATE_FAILED',
          context: {
            function: 'createProject',
            data: { projectName }
          }
        },
        metrics: {
          durationMs: performance.now() - startTime
        }
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUserInteraction = (action: string, element: string) => {
    logger.trace('User interaction captured', {
      event: 'ANALYTICS_EVENT',
      metadata: {
        operation: 'user-interaction',
        data: {
          action,
          element,
          page: '/projects/create',
          timestamp: new Date().toISOString()
        }
      }
    });
  };

  // Helper function to get memory usage (if available)
  const getMemoryUsage = (): number => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  };

  // Helper function to generate correlation ID
  const generateCorrelationId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Project</h1>

      <div className="mb-6">
        <label htmlFor="projectName" className="block text-sm font-medium mb-2">
          Project Name
        </label>
        <input
          id="projectName"
          type="text"
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value);
            handleUserInteraction('input', 'project-name-field');
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter project name..."
          disabled={isCreating}
        />
      </div>

      <button
        onClick={() => {
          handleUserInteraction('click', 'create-project-button');
          createProject();
        }}
        disabled={isCreating || !projectName.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        {isCreating ? 'Creating...' : 'Create Project'}
      </button>

      {projects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Existing Projects</h2>
          <div className="space-y-2">
            {projects.map((project: any) => (
              <div
                key={project.id}
                className="p-3 bg-gray-50 rounded border"
                onClick={() => handleUserInteraction('click', `project-${project.id}`)}
              >
                <h3 className="font-medium">{project.name}</h3>
                <p className="text-sm text-gray-600">{project.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Example of logging React errors
export function LoggedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      logger.fatal('Unhandled JavaScript error', {
        event: 'ERROR_OCCURRED',
        error: {
          type: 'UnhandledError',
          message: error.message,
          stackTrace: error.error?.stack,
          context: {
            file: error.filename,
            line: error.lineno,
            column: error.colno
          }
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', {
        event: 'ERROR_OCCURRED',
        error: {
          type: 'UnhandledPromiseRejection',
          message: String(event.reason),
          context: {
            function: 'handleUnhandledRejection'
          }
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-600">Please refresh the page and try again.</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Example API route handler (Next.js API route)
// pages/api/projects.ts
export async function handler(req: any, res: any) {
  // Create logger for API request
  const apiLogger = LoggerFactory.createBackendLogger({
    service: 'artissist-api',
    environment: process.env.NODE_ENV || 'development',
    emojis: false, // Typically disabled in production
    context: {
      correlationId: req.headers['x-correlation-id'],
      userId: req.headers['x-user-id'],
      requestId: `req_${Date.now()}`
    },
    adapters: ['console', 'file'],
    level: 'INFO'
  });

  const startTime = Date.now();

  apiLogger.info('API request received', {
    event: 'API_REQUEST',
    metadata: {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']
    }
  });

  try {
    if (req.method === 'POST') {
      // Handle project creation
      const { name, type, description } = req.body;

      const project = {
        id: `proj_${Date.now()}`,
        name,
        type,
        description,
        createdAt: new Date().toISOString()
      };

      apiLogger.info('Project created via API', {
        event: 'PROJECT_LIFECYCLE',
        metadata: {
          operation: 'api-create-project',
          data: { projectId: project.id, name, type }
        },
        metrics: {
          durationMs: Date.now() - startTime
        }
      });

      res.status(201).json(project);
    } else if (req.method === 'GET') {
      // Handle project listing (mock data)
      const projects = [
        { id: 'proj_1', name: 'Sunset Painting', type: 'artwork' },
        { id: 'proj_2', name: 'Digital Portrait', type: 'digital' }
      ];

      apiLogger.info('Projects listed via API', {
        event: 'API_REQUEST',
        metadata: {
          operation: 'api-list-projects',
          data: { count: projects.length }
        },
        metrics: {
          durationMs: Date.now() - startTime
        }
      });

      res.status(200).json(projects);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    apiLogger.error('API request failed', {
      event: 'ERROR_OCCURRED',
      error: {
        type: error.constructor.name,
        message: error.message,
        stackTrace: error.stack
      },
      metrics: {
        durationMs: Date.now() - startTime
      }
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}
