# users/utils/ws_utils.py
import logging

try:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    CHANNELS_AVAILABLE = True
except ImportError:
    CHANNELS_AVAILABLE = False

logger = logging.getLogger(__name__)

def send_session_ws_event(user_id: int, action: str, session_id: int = None, jti: str = None) -> bool:
    if not CHANNELS_AVAILABLE:
        return False
    try:
        layer = get_channel_layer()
        if not layer:
            return False
        async_to_sync(layer.group_send)(
            f"user_sessions_{user_id}",
            {"type": "session_update", "data": {"action": action, "session_id": session_id, "jti": jti}},
        )
        return True
    except Exception as e:
        logger.warning(f"Failed WS event for user {user_id}: {e}")
        return False
