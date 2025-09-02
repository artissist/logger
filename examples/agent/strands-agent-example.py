#!/usr/bin/env python3
"""
Agent processing integration example using Strands Agents with Mosaic Logger
This example demonstrates how to integrate the logger into Strands agent processing workflows
"""

import asyncio
import time
import uuid
import json
import traceback
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

# Mock Strands Agent SDK structures (would be imported from actual SDK)
class ObservationType(Enum):
    CONVERSATION = "conversation"
    USER_INPUT = "user_input"
    SYSTEM_EVENT = "system_event"

@dataclass
class Observation:
    id: str
    type: ObservationType
    content: str
    metadata: Dict[str, Any]
    timestamp: float
    session_id: str
    user_id: str
    confidence: float = 1.0

@dataclass
class ProcessingResult:
    observation_id: str
    entities: List[Dict[str, Any]]
    intentions: List[str]
    confidence: float
    processing_time_ms: float
    tool_calls: List[Dict[str, Any]]
    extracted_data: Dict[str, Any]

# Mock Mosaic Logger for Agent (would be imported from actual Python client)
class MosaicAgentLogger:
    """Mock implementation of what the Python Agent Logger would look like"""
    
    def __init__(self, agent_id: str, environment: str, emojis: bool = False, 
                 context: dict = None, session_id: str = None):
        self.agent_id = agent_id
        self.environment = environment
        self.emojis = emojis
        self.context = context or {}
        self.session_id = session_id
    
    def info(self, message: str, **kwargs):
        self._log("INFO", message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        self._log("DEBUG", message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log("ERROR", message, **kwargs)
    
    def warn(self, message: str, **kwargs):
        self._log("WARN", message, **kwargs)
    
    def child(self, additional_context: dict):
        """Create child logger with additional context"""
        merged_context = {**self.context, **additional_context}
        return MosaicAgentLogger(
            self.agent_id, self.environment, self.emojis, 
            merged_context, self.session_id
        )
    
    def _log(self, level: str, message: str, **kwargs):
        event = kwargs.get('event', '')
        emoji_map = {
            'AGENT_PROCESSING': '🤖',
            'CONVERSATION_EVENT': '💬',
            'ERROR_OCCURRED': '🐛',
            'WARNING_ISSUED': '⚠️',
            'PERFORMANCE_METRIC': '⚡',
            'USER_AUTH': '👤',
            'SYSTEM_START': '🚀',
            'ANALYTICS_EVENT': '📊',
            'EXTERNAL_SERVICE': '🌐'
        }
        
        prefix = f"{emoji_map.get(event, '')} " if self.emojis and event in emoji_map else ""
        correlation_id = self.context.get('correlation_id', 'N/A')
        
        print(f"[{level}] [AGENT:{self.agent_id}] {prefix}{message} | correlation_id={correlation_id}")
        
        if kwargs.get('error'):
            error = kwargs['error']
            print(f"  ERROR: {error.get('type', 'Unknown')}: {error.get('message', '')}")
        
        if kwargs.get('metrics'):
            metrics = kwargs['metrics']
            if 'duration_ms' in metrics:
                print(f"  METRICS: duration={metrics['duration_ms']}ms")
        
        if kwargs.get('metadata'):
            metadata = kwargs['metadata']
            if 'extracted_entities' in metadata:
                print(f"  EXTRACTED: {metadata['extracted_entities']} entities")

class MosaicLoggerFactory:
    """Mock implementation of Agent LoggerFactory"""
    
    @staticmethod
    def create_agent_logger(agent_id: str, agent_type: str, environment: str,
                          emojis: bool = False, context: dict = None, session_id: str = None):
        return MosaicAgentLogger(agent_id, environment, emojis, context, session_id)

# Conversation Processing Agent
class ConversationProcessorAgent:
    """
    Example Strands agent that processes conversation observations
    with integrated Mosaic Logger
    """
    
    def __init__(self, agent_id: str = "conversation-processor"):
        self.agent_id = agent_id
        self.logger = MosaicLoggerFactory.create_agent_logger(
            agent_id=agent_id,
            agent_type="conversation_processor",
            environment="development",  # Would come from config
            emojis=True,  # Enable for development
            context={
                "agent_version": "2.1.0",
                "model_version": "conversation-v2",
                "processing_mode": "async"
            }
        )
        
        # Log agent initialization
        self.logger.info(
            f"Conversation processor agent initialized: {agent_id}",
            event="SYSTEM_START",
            metadata={
                "agent_type": "conversation_processor",
                "capabilities": ["entity_extraction", "intent_recognition", "context_tracking"]
            }
        )
    
    async def process_observation(self, observation: Observation) -> ProcessingResult:
        """Main processing method for conversation observations"""
        start_time = time.time()
        
        # Create observation-specific logger with additional context
        obs_logger = self.logger.child({
            'observation_id': observation.id,
            'session_id': observation.session_id,
            'user_id': observation.user_id,
            'correlation_id': f"obs_{observation.id}_{int(time.time())}"
        })
        
        obs_logger.info(
            f"Processing observation: {observation.type.value}",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "process_observation",
                "observation_type": observation.type.value,
                "confidence": observation.confidence,
                "content_length": len(observation.content)
            }
        )
        
        try:
            # Step 1: Content preprocessing
            processed_content = await self._preprocess_content(observation, obs_logger)
            
            # Step 2: Entity extraction
            entities = await self._extract_entities(processed_content, obs_logger)
            
            # Step 3: Intent recognition
            intentions = await self._recognize_intentions(processed_content, entities, obs_logger)
            
            # Step 4: Context integration
            contextual_data = await self._integrate_context(observation, entities, obs_logger)
            
            # Step 5: Tool calls if needed
            tool_calls = await self._execute_tool_calls(intentions, contextual_data, obs_logger)
            
            processing_time_ms = (time.time() - start_time) * 1000
            
            result = ProcessingResult(
                observation_id=observation.id,
                entities=entities,
                intentions=intentions,
                confidence=min(observation.confidence, 0.95),  # Cap confidence
                processing_time_ms=processing_time_ms,
                tool_calls=tool_calls,
                extracted_data=contextual_data
            )
            
            obs_logger.info(
                f"Observation processing completed successfully",
                event="AGENT_PROCESSING",
                metadata={
                    "operation": "process_observation_complete",
                    "entities_extracted": len(entities),
                    "intentions_found": len(intentions),
                    "tool_calls_made": len(tool_calls),
                    "final_confidence": result.confidence
                },
                metrics={
                    "processing_time_ms": round(processing_time_ms, 2),
                    "entities_count": len(entities),
                    "tools_used": len(tool_calls)
                }
            )
            
            # Log business metrics
            obs_logger.info(
                "Observation processing metrics",
                event="ANALYTICS_EVENT",
                metadata={
                    "metric_type": "processing_performance",
                    "observation_type": observation.type.value,
                    "processing_time_ms": processing_time_ms,
                    "entities_extracted": len(entities),
                    "success": True
                }
            )
            
            return result
            
        except Exception as e:
            processing_time_ms = (time.time() - start_time) * 1000
            
            obs_logger.error(
                f"Observation processing failed: {str(e)}",
                event="ERROR_OCCURRED",
                error={
                    "type": type(e).__name__,
                    "message": str(e),
                    "traceback": traceback.format_exc(),
                    "context": {
                        "observation_id": observation.id,
                        "observation_type": observation.type.value,
                        "processing_step": "unknown"
                    }
                },
                metrics={
                    "processing_time_ms": round(processing_time_ms, 2)
                }
            )
            
            # Re-raise with context
            raise RuntimeError(f"Failed to process observation {observation.id}: {str(e)}")
    
    async def _preprocess_content(self, observation: Observation, logger: MosaicAgentLogger) -> str:
        """Preprocess observation content"""
        logger.debug(
            "Preprocessing observation content",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "preprocess_content",
                "original_length": len(observation.content)
            }
        )
        
        # Simulate preprocessing (cleaning, normalization, etc.)
        await asyncio.sleep(0.05)
        
        processed = observation.content.strip().lower()
        
        logger.debug(
            "Content preprocessing completed",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "preprocess_content_complete",
                "processed_length": len(processed)
            }
        )
        
        return processed
    
    async def _extract_entities(self, content: str, logger: MosaicAgentLogger) -> List[Dict[str, Any]]:
        """Extract entities from processed content"""
        logger.debug(
            "Starting entity extraction",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "extract_entities",
                "content_length": len(content)
            }
        )
        
        # Simulate LLM call for entity extraction
        await asyncio.sleep(0.15)
        
        # Mock entity extraction results
        entities = []
        if "project" in content:
            entities.append({
                "type": "project",
                "value": "artwork project",
                "confidence": 0.9,
                "start_pos": content.find("project"),
                "end_pos": content.find("project") + len("project")
            })
        
        if "time" in content or "minutes" in content or "hours" in content:
            entities.append({
                "type": "time_duration",
                "value": "30 minutes",
                "confidence": 0.8,
                "extracted_from": "contextual inference"
            })
        
        if "paint" in content or "canvas" in content or "brush" in content:
            entities.append({
                "type": "material",
                "value": "painting supplies",
                "confidence": 0.85,
                "category": "art_materials"
            })
        
        logger.info(
            f"Entity extraction completed: found {len(entities)} entities",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "extract_entities_complete",
                "entities_found": len(entities),
                "entity_types": [e["type"] for e in entities]
            }
        )
        
        return entities
    
    async def _recognize_intentions(self, content: str, entities: List[Dict[str, Any]], 
                                  logger: MosaicAgentLogger) -> List[str]:
        """Recognize user intentions from content and entities"""
        logger.debug(
            "Starting intention recognition",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "recognize_intentions",
                "entities_count": len(entities)
            }
        )
        
        # Simulate intention recognition
        await asyncio.sleep(0.1)
        
        intentions = []
        
        # Rule-based intention detection (would be ML-based in practice)
        if any(e["type"] == "project" for e in entities):
            intentions.append("create_project")
        
        if "finished" in content or "completed" in content:
            intentions.append("mark_complete")
        
        if any(e["type"] == "time_duration" for e in entities):
            intentions.append("log_time")
        
        if any(e["type"] == "material" for e in entities):
            intentions.append("track_materials")
        
        if not intentions:
            intentions.append("general_logging")
        
        logger.info(
            f"Intention recognition completed: identified {len(intentions)} intentions",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "recognize_intentions_complete",
                "intentions": intentions
            }
        )
        
        return intentions
    
    async def _integrate_context(self, observation: Observation, entities: List[Dict[str, Any]], 
                               logger: MosaicAgentLogger) -> Dict[str, Any]:
        """Integrate observation with session context"""
        logger.debug(
            "Integrating session context",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "integrate_context",
                "session_id": observation.session_id
            }
        )
        
        # Simulate context retrieval and integration
        await asyncio.sleep(0.08)
        
        # Mock contextual data
        contextual_data = {
            "session_context": {
                "current_project": "digital_art_piece_001",
                "session_duration_minutes": 45,
                "previous_activities": ["sketching", "color_selection"]
            },
            "user_context": {
                "skill_level": "intermediate",
                "preferred_medium": "digital",
                "active_projects": 3
            },
            "extracted_structured_data": {
                "projects": [e for e in entities if e["type"] == "project"],
                "materials": [e for e in entities if e["type"] == "material"],
                "time_entries": [e for e in entities if e["type"] == "time_duration"]
            }
        }
        
        logger.info(
            "Context integration completed",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "integrate_context_complete",
                "context_elements": len(contextual_data),
                "current_project": contextual_data["session_context"]["current_project"]
            }
        )
        
        return contextual_data
    
    async def _execute_tool_calls(self, intentions: List[str], contextual_data: Dict[str, Any], 
                                logger: MosaicAgentLogger) -> List[Dict[str, Any]]:
        """Execute tool calls based on recognized intentions"""
        logger.debug(
            f"Executing tool calls for {len(intentions)} intentions",
            event="AGENT_PROCESSING",
            metadata={
                "operation": "execute_tool_calls",
                "intentions": intentions
            }
        )
        
        tool_calls = []
        
        for intention in intentions:
            tool_call_start = time.time()
            
            if intention == "create_project":
                result = await self._call_create_project_tool(contextual_data, logger)
                tool_calls.append({
                    "tool": "create_project",
                    "intention": intention,
                    "result": result,
                    "duration_ms": (time.time() - tool_call_start) * 1000
                })
            
            elif intention == "log_time":
                result = await self._call_log_time_tool(contextual_data, logger)
                tool_calls.append({
                    "tool": "log_time",
                    "intention": intention,
                    "result": result,
                    "duration_ms": (time.time() - tool_call_start) * 1000
                })
            
            elif intention == "track_materials":
                result = await self._call_track_materials_tool(contextual_data, logger)
                tool_calls.append({
                    "tool": "track_materials",
                    "intention": intention,
                    "result": result,
                    "duration_ms": (time.time() - tool_call_start) * 1000
                })
        
        if tool_calls:
            logger.info(
                f"Tool execution completed: {len(tool_calls)} tools called",
                event="AGENT_PROCESSING",
                metadata={
                    "operation": "execute_tool_calls_complete",
                    "tools_called": [tc["tool"] for tc in tool_calls],
                    "total_tools": len(tool_calls)
                }
            )
        else:
            logger.debug(
                "No tool calls required",
                event="AGENT_PROCESSING",
                metadata={"operation": "execute_tool_calls_complete"}
            )
        
        return tool_calls
    
    async def _call_create_project_tool(self, contextual_data: Dict[str, Any], 
                                      logger: MosaicAgentLogger) -> Dict[str, Any]:
        """Simulate project creation tool call"""
        logger.debug(
            "Calling create_project tool",
            event="EXTERNAL_SERVICE",
            metadata={"tool": "create_project"}
        )
        
        # Simulate API call
        await asyncio.sleep(0.2)
        
        result = {
            "success": True,
            "project_id": f"proj_{uuid.uuid4().hex[:8]}",
            "created_at": time.time()
        }
        
        logger.info(
            "Project creation tool completed",
            event="EXTERNAL_SERVICE",
            metadata={
                "tool": "create_project",
                "project_id": result["project_id"],
                "success": result["success"]
            }
        )
        
        return result
    
    async def _call_log_time_tool(self, contextual_data: Dict[str, Any], 
                                logger: MosaicAgentLogger) -> Dict[str, Any]:
        """Simulate time logging tool call"""
        logger.debug(
            "Calling log_time tool",
            event="EXTERNAL_SERVICE",
            metadata={"tool": "log_time"}
        )
        
        await asyncio.sleep(0.1)
        
        time_entries = contextual_data.get("extracted_structured_data", {}).get("time_entries", [])
        
        result = {
            "success": True,
            "time_logged_minutes": 30,  # Would extract from entities
            "entry_id": f"time_{uuid.uuid4().hex[:8]}"
        }
        
        logger.info(
            "Time logging tool completed",
            event="EXTERNAL_SERVICE",
            metadata={
                "tool": "log_time",
                "minutes_logged": result["time_logged_minutes"],
                "entry_id": result["entry_id"]
            }
        )
        
        return result
    
    async def _call_track_materials_tool(self, contextual_data: Dict[str, Any], 
                                       logger: MosaicAgentLogger) -> Dict[str, Any]:
        """Simulate material tracking tool call"""
        logger.debug(
            "Calling track_materials tool",
            event="EXTERNAL_SERVICE",
            metadata={"tool": "track_materials"}
        )
        
        await asyncio.sleep(0.05)
        
        materials = contextual_data.get("extracted_structured_data", {}).get("materials", [])
        
        result = {
            "success": True,
            "materials_tracked": len(materials),
            "tracking_id": f"mat_{uuid.uuid4().hex[:8]}"
        }
        
        logger.info(
            "Material tracking tool completed",
            event="EXTERNAL_SERVICE",
            metadata={
                "tool": "track_materials",
                "materials_count": result["materials_tracked"],
                "tracking_id": result["tracking_id"]
            }
        )
        
        return result

# Session Manager with logging
class SessionManager:
    """Manages conversation sessions with logging"""
    
    def __init__(self):
        self.logger = MosaicLoggerFactory.create_agent_logger(
            agent_id="session-manager",
            agent_type="session_manager",
            environment="development",
            emojis=True,
            context={"component": "session_management"}
        )
        
        self.active_sessions = {}
        
        self.logger.info(
            "Session Manager initialized",
            event="SYSTEM_START",
            metadata={"component": "session_manager"}
        )
    
    async def start_session(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Start a new conversation session"""
        self.logger.info(
            f"Starting new session: {session_id}",
            event="CONVERSATION_EVENT",
            metadata={
                "operation": "start_session",
                "session_id": session_id,
                "user_id": user_id
            }
        )
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "started_at": time.time(),
            "observations_processed": 0,
            "last_activity": time.time()
        }
        
        self.active_sessions[session_id] = session_data
        
        self.logger.info(
            f"Session started successfully: {session_id}",
            event="CONVERSATION_EVENT",
            metadata={
                "operation": "session_started",
                "session_id": session_id,
                "active_sessions_count": len(self.active_sessions)
            }
        )
        
        return session_data
    
    async def end_session(self, session_id: str):
        """End a conversation session"""
        if session_id in self.active_sessions:
            session_data = self.active_sessions[session_id]
            duration = time.time() - session_data["started_at"]
            
            self.logger.info(
                f"Ending session: {session_id}",
                event="CONVERSATION_EVENT",
                metadata={
                    "operation": "end_session",
                    "session_id": session_id,
                    "observations_processed": session_data["observations_processed"],
                    "session_duration_seconds": round(duration, 2)
                }
            )
            
            del self.active_sessions[session_id]

# Example usage and demo
async def main():
    """Demonstrate agent processing with Mosaic Logger"""
    
    print("🤖 Mosaic Logger Agent Processing Demo")
    print("=" * 50)
    
    # Initialize agent and session manager
    agent = ConversationProcessorAgent("conversation-processor-demo")
    session_manager = SessionManager()
    
    # Start demo session
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    user_id = f"user_{uuid.uuid4().hex[:8]}"
    
    await session_manager.start_session(user_id, session_id)
    
    # Create sample observations
    observations = [
        Observation(
            id=f"obs_{uuid.uuid4().hex[:8]}",
            type=ObservationType.CONVERSATION,
            content="I just finished working on my digital art project for 2 hours using Photoshop and my Wacom tablet",
            metadata={"source": "voice_input", "language": "en"},
            timestamp=time.time(),
            session_id=session_id,
            user_id=user_id,
            confidence=0.95
        ),
        Observation(
            id=f"obs_{uuid.uuid4().hex[:8]}",
            type=ObservationType.USER_INPUT,
            content="I want to create a new painting project with acrylic paints on canvas",
            metadata={"source": "text_input", "language": "en"},
            timestamp=time.time(),
            session_id=session_id,
            user_id=user_id,
            confidence=0.9
        ),
        Observation(
            id=f"obs_{uuid.uuid4().hex[:8]}",
            type=ObservationType.CONVERSATION,
            content="The color mixing took about 30 minutes and I used titanium white and ultramarine blue",
            metadata={"source": "voice_input", "language": "en"},
            timestamp=time.time(),
            session_id=session_id,
            user_id=user_id,
            confidence=0.88
        )
    ]
    
    # Process each observation
    results = []
    for i, observation in enumerate(observations, 1):
        print(f"\n--- Processing Observation {i}/3 ---")
        
        try:
            result = await agent.process_observation(observation)
            results.append(result)
            
            print(f"✅ Processed observation {observation.id}")
            print(f"   Entities: {len(result.entities)}")
            print(f"   Intentions: {len(result.intentions)}")
            print(f"   Tool calls: {len(result.tool_calls)}")
            print(f"   Processing time: {result.processing_time_ms:.2f}ms")
            
        except Exception as e:
            print(f"❌ Failed to process observation {observation.id}: {str(e)}")
    
    # End session
    await session_manager.end_session(session_id)
    
    print(f"\n🎉 Demo completed! Processed {len(results)} observations successfully")
    print("\nAgent processing demonstration with Mosaic Logger integration complete!")

if __name__ == "__main__":
    asyncio.run(main())