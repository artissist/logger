# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Emoji resolution system for Artissist Logger Python client
"""

from dataclasses import dataclass
from typing import Dict, Optional

from .types import LogEvent
from .generated_types import TYPED_EMOJI_MAPPINGS


@dataclass
class EmojiMapping:
    """Mapping between events and emojis"""

    emoji: str
    description: str
    is_default: bool = True


class EmojiResolver:
    """Resolves log events to emoji representations"""

    # Legacy emoji mappings for backwards compatibility
    # Contains the old Python-specific emoji mappings
    LEGACY_MAPPINGS: Dict[LogEvent, EmojiMapping] = {
        LogEvent.SYSTEM_START: EmojiMapping(
            "🚀", "System startup or initialization"
        ),
        LogEvent.SYSTEM_STOP: EmojiMapping(
            "🛑", "System shutdown or termination"
        ),
        LogEvent.USER_AUTH: EmojiMapping("👤", "User authentication events"),
        LogEvent.USER_AUTHZ: EmojiMapping(
            "🔐", "Authorization and permission events"
        ),
        LogEvent.PROJECT_LIFECYCLE: EmojiMapping(
            "📁", "Project lifecycle events"
        ),
        LogEvent.DATABASE_OPERATION: EmojiMapping("💾", "Database operations"),
        LogEvent.API_REQUEST: EmojiMapping(
            "🔄", "API request/response events"
        ),
        LogEvent.PERFORMANCE_METRIC: EmojiMapping(
            "⚡", "Performance metrics and timing"
        ),
        LogEvent.ERROR_OCCURRED: EmojiMapping(
            "🐛", "Error conditions and exceptions"
        ),
        LogEvent.WARNING_ISSUED: EmojiMapping("⚠️", "Warning conditions"),
        LogEvent.CONFIG_CHANGE: EmojiMapping("🔧", "Configuration changes"),
        LogEvent.ANALYTICS_EVENT: EmojiMapping(
            "📊", "Analytics and tracking events"
        ),
        LogEvent.AGENT_PROCESSING: EmojiMapping(
            "🤖", "Agent processing events"
        ),
        LogEvent.CONVERSATION_EVENT: EmojiMapping(
            "💬", "Conversation and interaction events"
        ),
        # BREAKING CHANGE: These emojis have been unified with TypeScript
        LogEvent.ASSET_PROCESSING: EmojiMapping(
            "🖼️", "Asset upload and processing"  # was 🖼️, now 📸
        ),
        LogEvent.INSPIRATION_EVENT: EmojiMapping(
            "💡", "Inspiration capture events"  # was 💡, now 🎨
        ),
        LogEvent.INFRASTRUCTURE_DEPLOY: EmojiMapping(
            "🚢", "Infrastructure deployment events"  # was 🚢, now 🏗️
        ),
        LogEvent.BUSINESS_METRIC: EmojiMapping("📈", "Business metric events"),
        LogEvent.SEARCH_OPERATION: EmojiMapping(
            "🔍", "Search and discovery events"
        ),
        LogEvent.BACKGROUND_JOB: EmojiMapping(
            "⚙️", "Background job processing"
        ),
        LogEvent.NOTIFICATION_SENT: EmojiMapping(
            "📢", "Notification events"  # was 📢, now 📧
        ),
        LogEvent.SECURITY_EVENT: EmojiMapping("🔒", "Security-related events"),
        LogEvent.SCHEDULED_TASK: EmojiMapping(
            "⏰", "Scheduled task execution"
        ),
        LogEvent.EXTERNAL_SERVICE: EmojiMapping(
            "🔌", "External service integration"  # was 🔌, now 🌐
        ),
        LogEvent.AUDIT_TRAIL: EmojiMapping("📋", "Audit trail events"),
    }

    def __init__(
        self, custom_mappings: Optional[Dict[str, EmojiMapping]] = None
    ):
        """Initialize with optional custom emoji mappings"""
        self.custom_mappings = custom_mappings or {}
        self._default_mappings: Optional[Dict[LogEvent, EmojiMapping]] = None

    @property
    def default_mappings(self) -> Dict[LogEvent, EmojiMapping]:
        """Get default emoji mappings from generated Smithy types"""
        if self._default_mappings is None:
            self._default_mappings = {
                event: EmojiMapping(
                    str(config["emoji"]),
                    str(config["description"]),
                    bool(config["is_default"]),
                )
                for event, config in TYPED_EMOJI_MAPPINGS.items()
            }
        return self._default_mappings

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
        if event and event in self.default_mappings:
            return self.default_mappings[event].emoji

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
        if event and event in self.default_mappings:
            return self.default_mappings[event].description

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
        for event, mapping in self.default_mappings.items():
            result[event.value] = mapping

        # Add custom mappings
        result.update(self.custom_mappings)

        return result
