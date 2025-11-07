"""
WebSocket Server for Real-Time LERS Communication
Handles:
- Chat messages between IO and Provider
- User presence/online status
- Real-time notifications
- Typing indicators
"""
import os
import sys
import django
import socketio
import logging
# from aioredis import from_url as redis_from_url  # Disabled due to Python 3.11 incompatibility
from django.conf import settings

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms_lers.settings')
django.setup()

from apps.lers.models import LERSMessage, UserPresence, LERSNotification, LERSRequest
from apps.authentication.models import User
from django.utils import timezone

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# SOCKET.IO SERVER SETUP
# ═══════════════════════════════════════════════════════════════════

# Create Socket.IO server with Redis for multi-instance scaling
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # Configure properly in production
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# ASGI application
app = socketio.ASGIApp(
    sio,
    socketio_path='/socket.io'
)

# Connected users: {socket_id: user_id}
connected_users = {}

# Request rooms: {request_id: [socket_ids]}
request_rooms = {}


# ═══════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════

async def get_user_from_token(token):
    """
    Validate JWT token and return user.
    """
    import traceback
    try:
        from rest_framework_simplejwt.tokens import AccessToken

        logger.info(f"Validating token: {token[:50]}...")

        # Validate token
        access_token = AccessToken(token)
        user_id = access_token['user_id']

        logger.info(f"Token valid, user_id: {user_id}")

        # Get user
        user = await User.objects.aget(id=user_id)
        logger.info(f"User found: {user.email}")
        return user
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return None


# ═══════════════════════════════════════════════════════════════════
# CONNECTION EVENTS
# ═══════════════════════════════════════════════════════════════════

@sio.event
async def connect(sid, environ, auth):
    """
    Client connects to WebSocket.
    Requires JWT token in auth dict.
    """
    logger.info(f"🔌 Client connecting: {sid}")
    
    # Authenticate user
    token = auth.get('token') if auth else None
    if not token:
        logger.warning(f"❌ Connection rejected (no token): {sid}")
        return False
    
    user = await get_user_from_token(token)
    if not user:
        logger.warning(f"❌ Connection rejected (invalid token): {sid}")
        return False
    
    # Store connected user
    connected_users[sid] = str(user.id)
    
    # Update user presence to ONLINE
    try:
        presence, created = await UserPresence.objects.aget_or_create(
            user=user,
            defaults={'status': UserPresence.Status.ONLINE}
        )
        if not created:
            presence.status = UserPresence.Status.ONLINE
            presence.socket_id = sid
            presence.last_online = timezone.now()
            await presence.asave()
        
        logger.info(f"✅ User connected: {user.email} ({sid})")
        
        # Broadcast presence update to other users
        await sio.emit('user_online', {
            'user_id': str(user.id),
            'user_email': user.email,
            'user_name': user.full_name or user.email,
            'status': 'ONLINE'
        }, skip_sid=sid)
        
        return True
    except Exception as e:
        logger.error(f"❌ Connection error: {e}")
        return False


@sio.event
async def disconnect(sid):
    """
    Client disconnects from WebSocket.
    """
    logger.info(f"🔌 Client disconnecting: {sid}")
    
    if sid not in connected_users:
        return
    
    user_id = connected_users[sid]
    del connected_users[sid]
    
    try:
        # Update user presence to OFFLINE
        user = await User.objects.aget(id=user_id)
        presence = await UserPresence.objects.aget(user=user)
        presence.status = UserPresence.Status.OFFLINE
        presence.socket_id = ''
        await presence.asave()
        
        logger.info(f"✅ User disconnected: {user.email}")
        
        # Broadcast presence update
        await sio.emit('user_offline', {
            'user_id': str(user.id),
            'user_email': user.email,
            'user_name': user.full_name or user.email,
            'status': 'OFFLINE'
        })
    except Exception as e:
        logger.error(f"❌ Disconnect error: {e}")


# ═══════════════════════════════════════════════════════════════════
# CHAT EVENTS
# ═══════════════════════════════════════════════════════════════════

@sio.event
async def join_chat(sid, data):
    """
    Join a LERS request chat room.
    Data: { request_id: str }
    """
    try:
        request_id = data.get('request_id')
        if not request_id:
            await sio.emit('error', {'message': 'request_id required'}, room=sid)
            return
        
        # Verify request exists
        request = await LERSRequest.objects.aget(id=request_id)
        
        # Join Socket.IO room
        await sio.enter_room(sid, f"request_{request_id}")
        
        # Track room membership
        if request_id not in request_rooms:
            request_rooms[request_id] = []
        if sid not in request_rooms[request_id]:
            request_rooms[request_id].append(sid)
        
        user_id = connected_users.get(sid)
        user = await User.objects.aget(id=user_id)
        
        logger.info(f"✅ User {user.email} joined chat for request {request.request_number}")
        
        # Notify other room members
        await sio.emit('user_joined_chat', {
            'request_id': request_id,
            'user_id': str(user.id),
            'user_name': user.full_name or user.email
        }, room=f"request_{request_id}", skip_sid=sid)
        
    except LERSRequest.DoesNotExist:
        await sio.emit('error', {'message': 'Request not found'}, room=sid)
    except Exception as e:
        logger.error(f"❌ join_chat error: {e}")
        await sio.emit('error', {'message': str(e)}, room=sid)


@sio.event
async def leave_chat(sid, data):
    """
    Leave a LERS request chat room.
    Data: { request_id: str }
    """
    try:
        request_id = data.get('request_id')
        if not request_id:
            return
        
        # Leave Socket.IO room
        await sio.leave_room(sid, f"request_{request_id}")
        
        # Remove from room tracking
        if request_id in request_rooms and sid in request_rooms[request_id]:
            request_rooms[request_id].remove(sid)
        
        user_id = connected_users.get(sid)
        if user_id:
            user = await User.objects.aget(id=user_id)
            logger.info(f"✅ User {user.email} left chat for request {request_id}")
            
            # Notify other room members
            await sio.emit('user_left_chat', {
                'request_id': request_id,
                'user_id': str(user.id),
                'user_name': user.full_name or user.email
            }, room=f"request_{request_id}", skip_sid=sid)
    except Exception as e:
        logger.error(f"❌ leave_chat error: {e}")


@sio.event
async def send_message(sid, data):
    """
    Send a chat message in a LERS request.
    Data: { request_id: str, message_text: str, attachments: [] }
    
    Note: This is for real-time broadcast. The message should be 
    created via REST API first, and this just broadcasts it.
    """
    try:
        request_id = data.get('request_id')
        message_id = data.get('message_id')
        
        if not request_id or not message_id:
            await sio.emit('error', {'message': 'request_id and message_id required'}, room=sid)
            return
        
        # Get message from database
        message = await LERSMessage.objects.select_related('sender', 'request').aget(id=message_id)
        
        # Broadcast to all users in the request room
        await sio.emit('new_message', {
            'id': str(message.id),
            'request_id': str(message.request.id),
            'request_number': message.request.request_number,
            'sender_id': str(message.sender.id) if message.sender else None,
            'sender_name': message.sender.full_name or message.sender.email if message.sender else 'System',
            'sender_email': message.sender.email if message.sender else None,
            'sender_type': message.sender_type,
            'message_type': message.message_type,
            'message_text': message.message_text,
            'attachments': message.attachments,
            'created_at': message.created_at.isoformat(),
            'metadata': message.metadata
        }, room=f"request_{request_id}")
        
        logger.info(f"✅ Message broadcasted in request {message.request.request_number}")
        
    except LERSMessage.DoesNotExist:
        await sio.emit('error', {'message': 'Message not found'}, room=sid)
    except Exception as e:
        logger.error(f"❌ send_message error: {e}")
        await sio.emit('error', {'message': str(e)}, room=sid)


@sio.event
async def typing(sid, data):
    """
    Broadcast typing indicator to chat room.
    Data: { request_id: str, is_typing: bool }
    """
    try:
        request_id = data.get('request_id')
        is_typing = data.get('is_typing', True)

        if not request_id:
            return

        user_id = connected_users.get(sid)
        if not user_id:
            return

        user = await User.objects.aget(id=user_id)

        # Broadcast to room (excluding sender)
        await sio.emit('user_typing', {
            'request_id': request_id,
            'user_id': str(user.id),
            'user_name': user.full_name or user.email,
            'is_typing': is_typing
        }, room=f"request_{request_id}", skip_sid=sid)

    except Exception as e:
        logger.error(f"❌ typing error: {e}")


@sio.event
async def mark_message_read(sid, data):
    """
    Mark a message as read and broadcast to sender.
    Data: { message_id: str, request_id: str }
    """
    try:
        message_id = data.get('message_id')
        request_id = data.get('request_id')

        if not message_id or not request_id:
            return

        # Mark message as read in database
        message = await LERSMessage.objects.aget(id=message_id)
        if not message.read_by_receiver:
            message.read_by_receiver = True
            message.read_at = timezone.now()
            await message.asave(update_fields=['read_by_receiver', 'read_at'])

            # Broadcast read receipt to all users in the room
            await sio.emit('message_read', {
                'message_id': str(message_id),
                'request_id': str(request_id),
                'read_at': message.read_at.isoformat()
            }, room=f"request_{request_id}")

            logger.info(f"✅ Message {message_id} marked as read")

    except LERSMessage.DoesNotExist:
        logger.error(f"❌ Message {message_id} not found")
    except Exception as e:
        logger.error(f"❌ mark_message_read error: {e}")


# ═══════════════════════════════════════════════════════════════════
# PRESENCE EVENTS
# ═══════════════════════════════════════════════════════════════════

@sio.event
async def update_presence(sid, data):
    """
    Update user presence status.
    Data: { status: 'ONLINE' | 'AWAY' | 'OFFLINE' }
    """
    try:
        status = data.get('status', 'ONLINE')
        user_id = connected_users.get(sid)
        
        if not user_id:
            return
        
        user = await User.objects.aget(id=user_id)
        presence = await UserPresence.objects.aget(user=user)
        
        if status == 'ONLINE':
            presence.status = UserPresence.Status.ONLINE
            presence.socket_id = sid
            presence.last_online = timezone.now()
        elif status == 'AWAY':
            presence.status = UserPresence.Status.AWAY
        elif status == 'OFFLINE':
            presence.status = UserPresence.Status.OFFLINE
            presence.socket_id = ''
        
        await presence.asave()
        
        # Broadcast presence update
        await sio.emit('presence_updated', {
            'user_id': str(user.id),
            'user_email': user.email,
            'user_name': user.full_name or user.email,
            'status': status,
            'last_seen': presence.last_seen.isoformat() if presence.last_seen else None
        }, skip_sid=sid)
        
        logger.info(f"✅ Presence updated: {user.email} -> {status}")
        
    except Exception as e:
        logger.error(f"❌ update_presence error: {e}")


# ═══════════════════════════════════════════════════════════════════
# NOTIFICATION EVENTS
# ═══════════════════════════════════════════════════════════════════

async def broadcast_notification(notification_id):
    """
    Broadcast a notification to a specific user.
    Called from REST API after creating notification.
    """
    try:
        notification = await LERSNotification.objects.select_related('user', 'request').aget(id=notification_id)
        
        # Find user's socket ID
        user_socket_id = None
        for sid, uid in connected_users.items():
            if uid == str(notification.user.id):
                user_socket_id = sid
                break
        
        if user_socket_id:
            # User is online, send notification
            await sio.emit('new_notification', {
                'id': str(notification.id),
                'type': notification.type,
                'type_display': notification.get_type_display(),
                'title': notification.title,
                'message': notification.message,
                'icon': notification.icon,
                'link': notification.link,
                'priority': notification.priority,
                'priority_display': notification.get_priority_display(),
                'request_id': str(notification.request.id) if notification.request else None,
                'request_number': notification.request.request_number if notification.request else None,
                'created_at': notification.created_at.isoformat()
            }, room=user_socket_id)
            
            # Mark as delivered
            notification.delivered = True
            notification.delivered_at = timezone.now()
            await notification.asave()
            
            logger.info(f"✅ Notification delivered to {notification.user.email}")
        else:
            logger.info(f"ℹ️ User {notification.user.email} offline, notification queued")
    except Exception as e:
        logger.error(f"❌ broadcast_notification error: {e}")


@sio.event
async def get_unread_count(sid, data):
    """
    Get unread notification count for current user.
    """
    try:
        user_id = connected_users.get(sid)
        if not user_id:
            return
        
        user = await User.objects.aget(id=user_id)
        count = await LERSNotification.objects.filter(user=user, read=False).acount()
        
        await sio.emit('unread_count', {
            'count': count
        }, room=sid)
        
    except Exception as e:
        logger.error(f"❌ get_unread_count error: {e}")


# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS (FOR REST API INTEGRATION)
# ═══════════════════════════════════════════════════════════════════

async def notify_user(user_id, notification_data):
    """
    Helper to send notification to user if they're online.
    Can be called from REST API views.
    """
    user_socket_id = None
    for sid, uid in connected_users.items():
        if uid == str(user_id):
            user_socket_id = sid
            break
    
    if user_socket_id:
        await sio.emit('new_notification', notification_data, room=user_socket_id)


# ═══════════════════════════════════════════════════════════════════
# SERVER STARTUP
# ═══════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    import uvicorn
    
    logger.info("🚀 Starting LERS WebSocket Server")
    logger.info("📡 Socket.IO path: /socket.io")
    logger.info("🌐 CORS: * (configure properly in production)")
    logger.info("🔌 Server running on: http://0.0.0.0:8001")
    
    # Start ASGI server with uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001, log_level='info')

