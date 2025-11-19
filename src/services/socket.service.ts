import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '@/utils/authHelper';

const SOCKET_URL = 'https://sharplook-be.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  /**
   * Connect to Socket.IO server
   */
  async connect(): Promise<void> {
    try {
      if (this.socket?.connected) {
        console.log('🔌 Socket already connected');
        return;
      }

      const token = await getStoredToken();
      
      if (!token) {
        console.error('❌ No auth token found for socket connection');
        return;
      }

      console.log('🔵 Connecting to Socket.IO server...');
      console.log('   URL:', SOCKET_URL);

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Socket connection error:', error);
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Socket connected successfully');
      console.log('   Socket ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('🔴 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Auth success
    this.socket.on('authenticated', () => {
      console.log('🔐 Socket authenticated successfully');
    });
  }

  /**
   * Disconnect from socket
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔴 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    const connected = this.socket?.connected || false;
    console.log('🔍 Socket connection check:', connected ? '✅ CONNECTED' : '❌ DISCONNECTED');
    return connected;
  }

  // ==================== CONVERSATION EVENTS ====================

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot join conversation - socket not initialized');
      return;
    }

    console.log('🚪 EMITTING join:conversation for:', conversationId);
    this.socket.emit('join:conversation', conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot leave conversation - socket not initialized');
      return;
    }

    console.log('🚪 EMITTING leave:conversation for:', conversationId);
    this.socket.emit('leave:conversation', conversationId);
  }

  /**
   * Listen for joined conversation confirmation
   */
  onJoinedConversation(callback: (data: { conversationId: string }) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for joined:conversation - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: joined:conversation');
    this.socket.on('joined:conversation', (data) => {
      console.log('📥 RECEIVED joined:conversation:', data);
      callback(data);
    });
  }

  // ==================== MESSAGE EVENTS ====================

  /**
   * Listen for new messages
   */
  onMessageReceived(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for messages - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: message:received');
    this.socket.on('message:received', (data) => {
      console.log('📥 RECEIVED message:received:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  /**
   * Listen for message:new (alternative event)
   */
  onNewMessage(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for new messages - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: message:new');
    this.socket.on('message:new', (data) => {
      console.log('📥 RECEIVED message:new:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  /**
   * Listen for message status updates
   */
  onMessageStatus(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for message status - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: message:status');
    this.socket.on('message:status', (data) => {
      console.log('📥 RECEIVED message:status:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  /**
   * Mark message as delivered
   */
  markMessageAsDelivered(messageId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot mark as delivered - socket not initialized');
      return;
    }

    console.log('📤 EMITTING message:delivered for:', messageId);
    this.socket.emit('message:delivered', messageId);
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot mark as read - socket not initialized');
      return;
    }

    console.log('📤 EMITTING message:read for:', messageId);
    this.socket.emit('message:read', messageId);
  }

  /**
   * Mark conversation as read
   */
  markConversationAsRead(conversationId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot mark conversation as read - socket not initialized');
      return;
    }

    console.log('📤 EMITTING conversation:read for:', conversationId);
    this.socket.emit('conversation:read', conversationId);
  }

  /**
   * Listen for conversation read events
   */
  onConversationRead(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for conversation read - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: conversation:read');
    this.socket.on('conversation:read', (data) => {
      console.log('📥 RECEIVED conversation:read:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  // ==================== TYPING INDICATORS ====================

  /**
   * Emit typing start
   */
  startTyping(conversationId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot emit typing start - socket not initialized');
      return;
    }

    console.log('⌨️ EMITTING typing:start for conversation:', conversationId);
    this.socket.emit('typing:start', conversationId);
  }

  /**
   * Emit typing stop
   */
  stopTyping(conversationId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot emit typing stop - socket not initialized');
      return;
    }

    console.log('🛑 EMITTING typing:stop for conversation:', conversationId);
    this.socket.emit('typing:stop', conversationId);
  }

  /**
   * Listen for typing start
   */
  onTypingStart(callback: (data: { conversationId: string; userId: string }) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for typing start - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: typing:start');
    this.socket.on('typing:start', (data) => {
      console.log('📥 RECEIVED typing:start:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  /**
   * Listen for typing stop
   */
  onTypingStop(callback: (data: { conversationId: string; userId: string }) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for typing stop - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: typing:stop');
    this.socket.on('typing:stop', (data) => {
      console.log('📥 RECEIVED typing:stop:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  // ==================== USER STATUS ====================

  /**
   * Request user online status
   */
  requestUserStatus(userIds: string[]): void {
    if (!this.socket) {
      console.error('❌ Cannot request user status - socket not initialized');
      return;
    }

    console.log('🟢 EMITTING user:status:request for users:', userIds);
    this.socket.emit('user:status:request', userIds);
  }

  /**
   * Listen for user status response
   */
  onUserStatusResponse(callback: (statuses: Array<{ userId: string; isOnline: boolean }>) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for user status response - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: user:status:response');
    this.socket.on('user:status:response', (statuses) => {
      console.log('📥 RECEIVED user:status:response:', JSON.stringify(statuses, null, 2));
      callback(statuses);
    });
  }

  /**
   * Listen for user status updates
   */
  onUserStatus(callback: (data: { userId: string; isOnline: boolean }) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for user status - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: user:status');
    this.socket.on('user:status', (data) => {
      console.log('📥 RECEIVED user:status:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  // ==================== MESSAGE REACTIONS ====================

  /**
   * Add reaction to message
   */
  addReaction(messageId: string, emoji: string): void {
    if (!this.socket) {
      console.error('❌ Cannot add reaction - socket not initialized');
      return;
    }

    console.log('😀 EMITTING message:reaction:add for:', messageId, emoji);
    this.socket.emit('message:reaction:add', { messageId, emoji });
  }

  /**
   * Remove reaction from message
   */
  removeReaction(messageId: string, emoji: string): void {
    if (!this.socket) {
      console.error('❌ Cannot remove reaction - socket not initialized');
      return;
    }

    console.log('😐 EMITTING message:reaction:remove for:', messageId, emoji);
    this.socket.emit('message:reaction:remove', { messageId, emoji });
  }

  /**
   * Listen for message reactions
   */
  onMessageReaction(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for message reactions - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: message:reaction');
    this.socket.on('message:reaction', (data) => {
      console.log('📥 RECEIVED message:reaction:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  // ==================== MESSAGE DELETION ====================

  /**
   * Delete message
   */
  deleteMessage(messageId: string): void {
    if (!this.socket) {
      console.error('❌ Cannot delete message - socket not initialized');
      return;
    }

    console.log('🗑️ EMITTING message:delete for:', messageId);
    this.socket.emit('message:delete', messageId);
  }

  /**
   * Listen for message deletions
   */
  onMessageDeleted(callback: (data: { messageId: string; conversationId: string }) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen for message deletions - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for: message:deleted');
    this.socket.on('message:deleted', (data) => {
      console.log('📥 RECEIVED message:deleted:', JSON.stringify(data, null, 2));
      callback(data);
    });
  }

  // ==================== UTILITY ====================

  /**
   * Remove a specific event listener
   */
  removeListener(event: string): void {
    if (!this.socket) {
      console.warn('⚠️ Cannot remove listener - socket not initialized');
      return;
    }

    console.log('🔇 Removing listener for:', event);
    this.socket.off(event);
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Emit custom event
   */
  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.error('❌ Cannot emit - socket not initialized');
      return;
    }

    console.log('📤 EMITTING custom event:', event, data ? JSON.stringify(data) : '');
    this.socket.emit(event, data);
  }

  /**
   * Listen for custom event
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ Cannot listen - socket not initialized');
      return;
    }

    console.log('👂 Setting up listener for custom event:', event);
    this.socket.on(event, (data) => {
      console.log('📥 RECEIVED custom event:', event, JSON.stringify(data, null, 2));
      callback(data);
    });
  }
}

export default new SocketService();