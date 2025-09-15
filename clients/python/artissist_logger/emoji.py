# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Emoji resolution system for Artissist Logger Python client
"""

from dataclasses import dataclass
from typing import Dict, Optional

from .types import LogEvent


@dataclass
class EmojiMapping:
    """Mapping between events and emojis"""

    emoji: str
    description: str
    is_default: bool = True


class EmojiResolver:
    """Resolves log events to emoji representations"""

    # Default emoji mappings for all pre-defined events
    DEFAULT_MAPPINGS: Dict[LogEvent, EmojiMapping] = {
        LogEvent.SYSTEM_START: EmojiMapping(
            "🚀", "System startup or initialization"
        ),
        LogEvent.ERROR_OCCURRED: EmojiMapping(
            "🐛", "Error conditions and exceptions"
        ),
        LogEvent.API_REQUEST: EmojiMapping("🔄", "API requests and responses"),
        LogEvent.DATABASE_OPERATION: EmojiMapping(
            "💾", "Database queries and operations"
        ),
        LogEvent.USER_AUTH: EmojiMapping(
            "👤", "User authentication and authorization"
        ),
        LogEvent.PROJECT_LIFECYCLE: EmojiMapping(
            "📁", "Project creation, updates, and status changes"
        ),
        LogEvent.PERFORMANCE_METRIC: EmojiMapping(
            "⚡", "Performance measurements and metrics"
        ),
        LogEvent.WARNING_ISSUED: EmojiMapping(
            "⚠️", "Warning conditions and alerts"
        ),
        LogEvent.SECURITY_EVENT: EmojiMapping(
            "🔐", "Security-related events and violations"
        ),
        LogEvent.AI_INFERENCE: EmojiMapping(
            "🧠", "AI model inference and processing"
        ),
        LogEvent.CONVERSATION_EVENT: EmojiMapping(
            "💬", "Conversation logging and transcript events"
        ),
        LogEvent.AGENT_LIFECYCLE: EmojiMapping(
            "🤖", "Agent creation, updates, and task management"
        ),
        LogEvent.TASK_EXECUTION: EmojiMapping(
            "⚙️", "Task execution and workflow processing"
        ),
        LogEvent.BUSINESS_METRIC: EmojiMapping(
            "📊", "Business KPIs and analytics"
        ),
        LogEvent.INSPIRATION_EVENT: EmojiMapping(
            "💡", "Inspiration capture and management"
        ),
        LogEvent.WORKFLOW_EVENT: EmojiMapping(
            "🔀", "Workflow state transitions and automation"
        ),
        LogEvent.INTEGRATION_EVENT: EmojiMapping(
            "🔌", "Third-party integrations and API calls"
        ),
        LogEvent.CONFIGURATION_CHANGE: EmojiMapping(
            "🔧", "Configuration updates and settings"
        ),
        LogEvent.DEPLOYMENT_EVENT: EmojiMapping(
            "🚢", "Deployment and release events"
        ),
        LogEvent.BACKUP_OPERATION: EmojiMapping(
            "💿", "Backup and recovery operations"
        ),
        LogEvent.MAINTENANCE_EVENT: EmojiMapping(
            "🔨", "System maintenance and updates"
        ),
        LogEvent.USER_INTERACTION: EmojiMapping(
            "👆", "User interface interactions and clicks"
        ),
        LogEvent.DATA_PROCESSING: EmojiMapping(
            "🔄", "Data processing and transformation"
        ),
        LogEvent.CUSTOM_EVENT: EmojiMapping(
            "✨", "Custom application-specific events"
        ),
    }

    def __init__(
        self, custom_mappings: Optional[Dict[str, EmojiMapping]] = None
    ):
        """Initialize with optional custom emoji mappings"""
        self.custom_mappings = custom_mappings or {}

    def get_emoji(
        self, event: Optional[LogEvent], custom_event: Optional[str] = None
    ) -> Optional[str]:
        """
        Get emoji for an event

        Args:
            event: Pre-defined LogEvent
            custom_event: Custom event name for extension

        Returns:
            Emoji string or None if not found
        """
        if event and event in self.DEFAULT_MAPPINGS:
            return self.DEFAULT_MAPPINGS[event].emoji

        if custom_event and custom_event in self.custom_mappings:
            return self.custom_mappings[custom_event].emoji

        return None

    def get_description(
        self, event: Optional[LogEvent], custom_event: Optional[str] = None
    ) -> Optional[str]:
        """
        Get description for an event

        Args:
            event: Pre-defined LogEvent
            custom_event: Custom event name for extension

        Returns:
            Description string or None if not found
        """
        if event and event in self.DEFAULT_MAPPINGS:
            return self.DEFAULT_MAPPINGS[event].description

        if custom_event and custom_event in self.custom_mappings:
            return self.custom_mappings[custom_event].description

        return None

    def add_custom_mapping(self, event_name: str, mapping: EmojiMapping):
        """Add or update a custom emoji mapping"""
        self.custom_mappings[event_name] = mapping

    def remove_custom_mapping(self, event_name: str) -> bool:
        """Remove a custom emoji mapping"""
        if event_name in self.custom_mappings:
            del self.custom_mappings[event_name]
            return True
        return False

    def list_all_mappings(self) -> Dict[str, EmojiMapping]:
        """Get all available emoji mappings"""
        result = {}

        # Add default mappings
        for event, mapping in self.DEFAULT_MAPPINGS.items():
            result[event.value] = mapping

        # Add custom mappings
        result.update(self.custom_mappings)

        return result
