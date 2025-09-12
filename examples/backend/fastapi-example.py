#!/usr/bin/env python3
"""
Backend API integration example using FastAPI with Artissist Logger
This example demonstrates how to integrate artissist-logger into a Python FastAPI backend
"""

from typing import Optional, List
import time
import uuid
import os
import asyncio
import traceback
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import the real artissist-logger
from artissist_logger import LoggerFactory, LogEvent, LoggerContext, ErrorInfo, LogMetrics


# Remove the mock implementation - using real artissist-logger now
class ArtissistLoggerWrapper:
    """Wrapper to provide a convenient interface that matches the FastAPI dependency injection pattern"""

    def __init__(self, logger):
        self.logger = logger

    async def info(self, message: str, **kwargs):
        await self.logger.info(message, **kwargs)

    async def error(self, message: str, **kwargs):
        await self.logger.error(message, **kwargs)

    async def warn(self, message: str, **kwargs):
        await self.logger.warn(message, **kwargs)

    async def debug(self, message: str, **kwargs):
        await self.logger.debug(message, **kwargs)
# FastAPI application setup
app = FastAPI(
    title="Artissist Backend API",
    description="Example backend API with Artissist Logger integration",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize logger
logger = LoggerFactory.create_backend_logger(
    service="artissist-backend-api",
    environment=os.getenv("ENVIRONMENT", "development"),
    emojis=os.getenv("ENVIRONMENT") == "development",  # Enable emojis in dev
    context=LoggerContext(
        custom_context={
            "service_version": "1.0.0",
            "deployment_id": os.getenv("DEPLOYMENT_ID", "local"),
        }
    ),
    adapters=["console", "file"],
)


# Pydantic models
class ProjectCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    medium: Optional[str] = None


class Project(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str] = None
    medium: Optional[str] = None
    status: str = "planning"
    created_at: str


class LogEntry(BaseModel):
    message: str
    level: str
    event: Optional[str] = None
    user_id: Optional[str] = None


# Mock database
projects_db = {}


# Middleware for request logging and correlation ID
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()

    # Extract or generate correlation ID
    correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
    user_id = request.headers.get("x-user-id")

    # Create request logger with correlation context
    request_context = LoggerContext(
        correlation_id=correlation_id,
        user_id=user_id,
        request_id=f"req_{int(time.time() * 1000)}",
    )
    
    request_logger = logger.with_context(
        correlation_id=correlation_id,
        user_id=user_id,
        request_id=f"req_{int(time.time() * 1000)}",
    )

    # Log incoming request
    await request_logger.info(
        f"Incoming request: {request.method} {request.url.path}",
        event=LogEvent.API_REQUEST,
        metadata={
            "method": request.method,
            "path": request.url.path,
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host if request.client else None,
        },
    )

    # Add logger to request state
    request.state.logger = ArtissistLoggerWrapper(request_logger)
    request.state.correlation_id = correlation_id
    request.state.start_time = start_time

    try:
        response = await call_next(request)

        # Log successful response
        duration_ms = (time.time() - start_time) * 1000
        await request_logger.info(
            f"Request completed: {response.status_code}",
            event=LogEvent.API_REQUEST,
            metrics=LogMetrics(
                duration_ms=round(duration_ms, 2),
                custom_metrics={"status_code": response.status_code}
            ),
        )

        # Add correlation ID to response headers
        response.headers["x-correlation-id"] = correlation_id
        return response

    except Exception as e:
        # Log request error
        duration_ms = (time.time() - start_time) * 1000
        await request_logger.error(
            f"Request failed: {str(e)}",
            event=LogEvent.ERROR_OCCURRED,
            error=ErrorInfo(
                type=type(e).__name__,
                message=str(e),
                stack_trace=traceback.format_exc(),
            ),
            metrics=LogMetrics(duration_ms=round(duration_ms, 2)),
        )
        raise


# Dependency to get request logger
def get_logger(request: Request) -> ArtissistLoggerWrapper:
    return request.state.logger


# Startup event
@app.on_event("startup")
async def startup_event():
    await logger.info(
        "Artissist Backend API starting up",
        event=LogEvent.SYSTEM_START,
        metadata={
            "environment": os.getenv("ENVIRONMENT", "development"),
            "version": "1.0.0",
            "pid": os.getpid(),
        },
    )


# Health check endpoint
@app.get("/health")
async def health_check(request_logger: ArtissistLoggerWrapper = Depends(get_logger)):
    await request_logger.debug(
        "Health check requested", 
        event=LogEvent.API_REQUEST, 
        metadata={"endpoint": "/health"}
    )

    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "artissist-backend-api",
        "version": "1.0.0",
    }


# Projects endpoints
@app.get("/api/projects", response_model=List[Project])
async def list_projects(request_logger: ArtissistLoggerWrapper = Depends(get_logger)):
    start_time = time.time()

    await request_logger.info(
        "Fetching projects list",
        event=LogEvent.DATABASE_OPERATION,
        metadata={"operation": "list_projects"},
    )

    try:
        # Simulate database query
        await asyncio.sleep(0.1)  # Simulate DB latency

        projects_list = list(projects_db.values())

        await request_logger.info(
            "Projects retrieved successfully",
            event=LogEvent.DATABASE_OPERATION,
            metadata={"operation": "list_projects", "count": len(projects_list)},
            metrics=LogMetrics(duration_ms=round((time.time() - start_time) * 1000, 2)),
        )

        return projects_list

    except Exception as e:
        await request_logger.error(
            "Failed to retrieve projects",
            event=LogEvent.ERROR_OCCURRED,
            error=ErrorInfo(
                type=type(e).__name__,
                message=str(e),
                context={"operation": "list_projects"},
            ),
            metrics=LogMetrics(duration_ms=round((time.time() - start_time) * 1000, 2)),
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve projects")


@app.post("/api/projects", response_model=Project)
async def create_project(
    project_data: ProjectCreate, request_logger: ArtissistLoggerWrapper = Depends(get_logger)
):
    start_time = time.time()
    project_id = f"proj_{uuid.uuid4().hex[:8]}"

    await request_logger.info(
        f"Creating new project: {project_data.name}",
        event=LogEvent.PROJECT_LIFECYCLE,
        metadata={
            "operation": "create_project",
            "project_name": project_data.name,
            "project_type": project_data.type,
        },
    )

    try:
        # Validate project data
        if len(project_data.name.strip()) == 0:
            await request_logger.warn(
                "Project creation attempted with empty name",
                event=LogEvent.WARNING_ISSUED,
                metadata={"validation_error": "empty_name"},
            )
            raise HTTPException(status_code=400, detail="Project name cannot be empty")

        # Simulate database insertion
        await asyncio.sleep(0.05)  # Simulate DB write latency

        # Create project
        project = Project(
            id=project_id,
            name=project_data.name,
            type=project_data.type,
            description=project_data.description,
            medium=project_data.medium,
            status="planning",
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        )

        # Store in mock database
        projects_db[project_id] = project

        await request_logger.info(
            f"Project created successfully: {project.name}",
            event=LogEvent.PROJECT_LIFECYCLE,
            metadata={
                "operation": "create_project",
                "project_id": project_id,
                "project_name": project.name,
            },
            metrics=LogMetrics(duration_ms=round((time.time() - start_time) * 1000, 2)),
        )

        # Log business metric
        await request_logger.info(
            "New project created",
            event=LogEvent.BUSINESS_METRIC,
            metadata={
                "metric": "project_created",
                "value": 1,
                "project_type": project.type,
                "tags": {
                    "environment": os.getenv("ENVIRONMENT", "development"),
                    "api_version": "v1",
                },
            },
        )

        return project

    except HTTPException:
        raise
    except Exception as e:
        await request_logger.error(
            f"Failed to create project: {str(e)}",
            event=LogEvent.ERROR_OCCURRED,
            error=ErrorInfo(
                type=type(e).__name__,
                message=str(e),
                context={
                    "operation": "create_project",
                    "project_name": project_data.name,
                    "project_type": project_data.type,
                },
            ),
            metrics=LogMetrics(duration_ms=round((time.time() - start_time) * 1000, 2)),
        )
        raise HTTPException(status_code=500, detail="Failed to create project")


@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(
    project_id: str, request_logger: ArtissistLoggerWrapper = Depends(get_logger)
):
    await request_logger.debug(
        f"Fetching project: {project_id}",
        event=LogEvent.DATABASE_OPERATION,
        metadata={"operation": "get_project", "project_id": project_id},
    )

    if project_id not in projects_db:
        await request_logger.warn(
            f"Project not found: {project_id}",
            event=LogEvent.WARNING_ISSUED,
            metadata={
                "operation": "get_project",
                "project_id": project_id,
                "error": "not_found",
            },
        )
        raise HTTPException(status_code=404, detail="Project not found")

    project = projects_db[project_id]

    await request_logger.info(
        f"Project retrieved: {project.name}",
        event=LogEvent.DATABASE_OPERATION,
        metadata={
            "operation": "get_project",
            "project_id": project_id,
            "project_name": project.name,
        },
    )

    return project


# Authentication simulation endpoint
@app.post("/api/auth/login")
async def login(
    credentials: dict, request_logger: ArtissistLoggerWrapper = Depends(get_logger)
):
    start_time = time.time()

    await request_logger.info(
        "User login attempt",
        event=LogEvent.USER_AUTH,
        metadata={
            "operation": "login_attempt",
            "username": credentials.get("username", "unknown"),
        },
    )

    try:
        # Simulate authentication logic
        username = credentials.get("username")
        password = credentials.get("password")

        if not username or not password:
            await request_logger.warn(
                "Login attempt with missing credentials",
                event=LogEvent.SECURITY_EVENT,
                metadata={
                    "security_issue": "missing_credentials",
                    "username": username,
                },
            )
            raise HTTPException(
                status_code=400, detail="Username and password required"
            )

        # Simulate authentication check
        await asyncio.sleep(0.1)  # Simulate auth service latency

        if username == "demo" and password == "password":
            user_id = f"user_{uuid.uuid4().hex[:8]}"
            session_id = f"sess_{uuid.uuid4().hex[:8]}"

            await request_logger.info(
                f"User login successful: {username}",
                event=LogEvent.USER_AUTH,
                metadata={
                    "operation": "login_success",
                    "user_id": user_id,
                    "username": username,
                },
                metrics=LogMetrics(duration_ms=round((time.time() - start_time) * 1000, 2)),
            )

            return {
                "user_id": user_id,
                "session_id": session_id,
                "username": username,
                "token": f"token_{uuid.uuid4().hex}",
            }
        else:
            await request_logger.warn(
                f"Login failed for user: {username}",
                event=LogEvent.SECURITY_EVENT,
                metadata={
                    "security_issue": "invalid_credentials",
                    "username": username,
                },
                metrics=LogMetrics(duration_ms=round((time.time() - start_time) * 1000, 2)),
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")

    except HTTPException:
        raise
    except Exception as e:
        await request_logger.error(
            f"Login system error: {str(e)}",
            event=LogEvent.ERROR_OCCURRED,
            error=ErrorInfo(
                type=type(e).__name__, 
                message=str(e), 
                context={"operation": "login"}
            ),
            metrics=LogMetrics(duration_ms=round((time.time() - start_time) * 1000, 2)),
        )
        raise HTTPException(status_code=500, detail="Login system error")


# Performance metrics endpoint
@app.get("/api/metrics")
async def get_metrics(request_logger: ArtissistLoggerWrapper = Depends(get_logger)):
    import psutil

    await request_logger.debug(
        "Performance metrics requested",
        event=LogEvent.PERFORMANCE_METRIC,
        metadata={"operation": "get_system_metrics"},
    )

    try:
        # Collect system metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()

        metrics = {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used_mb": memory.used // (1024 * 1024),
            "memory_total_mb": memory.total // (1024 * 1024),
            "projects_count": len(projects_db),
            "timestamp": time.time(),
        }

        await request_logger.info(
            "System metrics collected",
            event=LogEvent.PERFORMANCE_METRIC,
            metadata={"operation": "system_metrics", "metrics": metrics},
        )

        return metrics

    except Exception as e:
        await request_logger.error(
            f"Failed to collect metrics: {str(e)}",
            event=LogEvent.ERROR_OCCURRED,
            error=ErrorInfo(
                type=type(e).__name__,
                message=str(e),
                context={"operation": "get_metrics"},
            ),
        )
        raise HTTPException(status_code=500, detail="Failed to collect metrics")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    await logger.info(
        "Artissist Backend API shutting down",
        event=LogEvent.SYSTEM_START,  # Note: There's no SYSTEM_STOP in LogEvent enum
        metadata={
            "uptime_seconds": time.time(),
            "total_projects_created": len(projects_db),
        },
    )


if __name__ == "__main__":
    import uvicorn

    # Log application startup
    async def log_startup():
        await logger.info(
            "Starting Artissist Backend API server",
            event=LogEvent.SYSTEM_START,
            metadata={
                "host": "0.0.0.0",
                "port": 8000,
                "environment": os.getenv("ENVIRONMENT", "development"),
            },
        )

    asyncio.run(log_startup())

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=os.getenv("ENVIRONMENT") == "development",
    )
