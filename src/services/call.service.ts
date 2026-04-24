import socketService from './socket.service';
import webrtcService from './webrtc.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface CallData {
  callId: string;
  type: CallType;
  caller: any;
  receiver: any;
  conversationId?: string;
  offer?: any;
}

class CallService {
  private callData: CallData | null = null;
  private callStatus: CallStatus = 'idle';
  private listeners: { [key: string]: Function[] } = {};
  private initialized: boolean = false;
  private currentUserId: string | null = null;
  private registeredSocketId: string | null = null;

  public async initialize() {
    // Cache the current user ID for synchronous self-call filtering
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        this.currentUserId = userData._id || userData.id;
        console.log('📞 Cached current user ID:', this.currentUserId);
      }
    } catch (error) {
      console.error('❌ Error caching user ID:', error);
    }

    // Always re-register listeners — socket may have reconnected and lost them
    const currentSocketId = socketService.getSocket()?.id || null;
    console.log('📞 Call service initializing. Socket ID:', currentSocketId, 'Previous:', this.registeredSocketId);

    this.registeredSocketId = currentSocketId;
    this.initialized = true;
    this.setupSocketListeners();
    console.log('📞 Call service initialized on socket:', currentSocketId);
  }

  public on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public removeListener(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  private emit(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }

  private setupSocketListeners() {
    socketService.on('call:initiated', (data: any) => {
      console.log('📞 Call initiated:', data);
      
      
      this.callData = {
        ...this.callData,
        ...data.call,
        callId: data.call._id || data.call.id,
      };
      console.log('   - Updated callId:', this.callData.callId);
      this.callStatus = 'calling';
      this.emit('call:initiated', data);
    });

    socketService.on('call:incoming', (data: any) => {
      const callerId = data.caller?._id || data.caller?.id;
      console.log('📞 Incoming call received:', callerId, 'type:', data.type, 'myStatus:', this.callStatus, 'myId:', this.currentUserId);


      // Guard 1: If we're already calling or connected, ignore
      if (this.callStatus !== 'idle') {
        console.log('⏭️ Ignoring incoming call - not idle (status:', this.callStatus, ')');
        return;
      }

      // Guard 2: Check if the caller is us (backend broadcasts to conversation room)
      if (this.currentUserId && callerId === this.currentUserId) {
        console.log('⏭️ Ignoring our own outgoing call - IDs match');
        return;
      }

      // Guard 3: Check if call.caller matches us (alternative field)
      const callCallerIdFromCall = data.call?.caller?._id || data.call?.caller?.id;
      if (this.currentUserId && callCallerIdFromCall === this.currentUserId) {
        console.log('⏭️ Ignoring our own outgoing call - call.caller._id matches');
        return;
      }

      console.log('✅ Processing incoming call from another user');
      this.callData = {
        callId: data.call._id,
        type: data.type,
        caller: data.caller,
        receiver: data.call.receiver,
        conversationId: data.conversationId,
      };
      this.callStatus = 'incoming';
      this.emit('call:incoming', data);
    });
    socketService.on('call:ringing', (data: any) => {
      console.log('📞 Call ringing (receiver is online):', data);
      this.emit('call:ringing', data);
    });

    socketService.on('call:accepted', (data: any) => {
      console.log('📞 Call accepted:', data);
      this.callStatus = 'connected';
      this.emit('call:accepted', data);
    });

    socketService.on('call:rejected', (data: any) => {
      console.log('📞 Call rejected:', data);
      this.callData = null;
      this.callStatus = 'idle';
      this.emit('call:rejected', data);
    });

    socketService.on('call:ended', (data: any) => {
      console.log('📞 Call ended:', data);
      this.callData = null;
      this.callStatus = 'idle';
      this.emit('call:ended', data);
    });

    socketService.on('call:cancelled', (data: any) => {
      console.log('📞 Call cancelled:', data);
      this.callData = null;
      this.callStatus = 'idle';
      this.emit('call:cancelled', data);
    });

    socketService.on('call:busy', (data: any) => {
      console.log('📞 User busy:', data);
      this.callData = null;
      this.callStatus = 'idle';
      this.emit('call:busy', data);
    });

    
    socketService.on('call:signal:offer', async (data: any) => {
      console.log('📞 Received offer via socket:', data);
      
      
      if (this.callData) {
        this.callData.offer = data.offer;
      }
      
      
      this.emit('call:signal:offer', data);
    });

    socketService.on('call:signal:answer', async (data: any) => {
      console.log('📞 Received answer via socket:', data);
      
      
      this.emit('call:signal:answer', data);
    });

    socketService.on('call:signal:hangup', (data: any) => {
      console.log('📞 Received hangup signal via socket:', data);
      this.callData = null;
      this.callStatus = 'idle';
      this.emit('call:ended', data);
    });

    socketService.on('call:signal:ice', async (data: any) => {
      // Check if this is a hangup signal disguised as ICE
      if (data.candidate?.type === 'hangup') {
        console.log('📞 Received hangup via ICE channel');
        this.callData = null;
        this.callStatus = 'idle';
        this.emit('call:ended', data);
        return;
      }

      console.log('📞 Received ICE candidate via socket:', data);
      this.emit('call:signal:ice', data);
    });
  }

  public async initiateCall(
    receiverId: string,
    type: CallType,
    offer?: any,
    conversationId?: string
  ) {
    try {
      console.log('📞 Initiating call:', { receiverId, type, conversationId, currentUserId: this.currentUserId });
      console.log('   - receiverId === currentUserId?', receiverId === this.currentUserId);

      // Set status BEFORE emit so the call:incoming guard works
      this.callStatus = 'calling';
      this.callData = {
        callId: 'pending',
        type: type,
        caller: { _id: this.currentUserId },
        receiver: { _id: receiverId },
        conversationId: conversationId,
      };

      socketService.emit('call:initiate', {
        receiverId,
        type,
        offer,
        conversationId,
      });
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      throw error;
    }
  }

  public async acceptCall(callId: string, type: CallType) {
    try {
      console.log('📞 Accepting call:', callId);

      
      if (!this.callData) {
        this.callData = {} as any;
      }
      this.callData!.callId = callId;
      console.log('   - Stored callId in callData:', callId);
      
      socketService.emit('call:accept', { callId });

      this.callStatus = 'connected';
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      throw error;
    }
  }

  public rejectCall(callId: string) {
    console.log('📞 Rejecting call:', callId);
    socketService.emit('call:reject', { callId });
    this.endCall();
  }

  public sendOffer(offer: any) {
    if (!this.callData) {
      console.error('❌ No call data available to send offer');
      return;
    }

    console.log('📞 Sending offer via socket');
    console.log('   - CallId:', this.callData.callId);
    console.log('   - Receiver:', this.callData.receiver?._id);
    
    socketService.emit('call:signal:offer', {
      callId: this.callData.callId,
      receiverId: this.callData.receiver._id || this.callData.receiver,
      offer: offer,
    });
  }

  public sendAnswer(answer: any) {
    if (!this.callData) {
      console.error('❌ No call data available to send answer');
      return;
    }

    console.log('📞 Sending answer via socket');
    console.log('   - CallId:', this.callData.callId);
    console.log('   - Caller:', this.callData.caller?._id);
    
    socketService.emit('call:signal:answer', {
      callId: this.callData.callId,
      callerId: this.callData.caller._id || this.callData.caller,
      answer: answer,
    });
  }

  public sendIceCandidate(candidate: any) {
    if (!this.callData) {
      console.error('❌ No call data available to send ICE candidate');
      return;
    }

    
    
    
    const receiverId = this.callStatus === 'calling' 
      ? this.callData.receiver._id || this.callData.receiver
      : this.callData.caller._id || this.callData.caller;

    console.log('📞 Sending ICE candidate via socket');
    console.log('   - CallId:', this.callData.callId);
    console.log('   - ReceiverId:', receiverId);
    console.log('   - Call status:', this.callStatus);
    
    socketService.emit('call:signal:ice', {
      callId: this.callData.callId,
      receiverId: receiverId,
      candidate: candidate,
    });
  }

  public endCall() {
    console.log('📞 [CallService] Ending call, callId:', this.callData?.callId);

    if (this.callData?.callId && this.callData.callId !== 'pending') {
      const otherUserId = this.currentUserId === (this.callData.caller?._id || this.callData.caller)
        ? this.callData.receiver?._id || this.callData.receiver
        : this.callData.caller?._id || this.callData.caller;

      // Send the appropriate event based on call status
      if (this.callStatus === 'calling') {
        // Call was never answered — cancel it
        socketService.emit('call:cancel', { callId: this.callData.callId });
      } else {
        // Call was connected or is being ended normally
        socketService.emit('call:end', { callId: this.callData.callId });
      }

      // Send hangup via call:signal:ice channel (the backend relays this)
      socketService.emit('call:signal:ice', {
        callId: this.callData.callId,
        receiverId: otherUserId,
        candidate: { type: 'hangup' },
      });
      console.log('📞 Sent hangup to:', otherUserId);
    }

    this.callData = null;
    this.callStatus = 'idle';
  }

  public cancelCall(callId: string) {
    console.log('📞 Cancelling call:', callId);
    socketService.emit('call:cancel', { callId });
    this.callData = null;
    this.callStatus = 'idle';
  }

  public toggleMute() {
    webrtcService.toggleMute();
  }

  public toggleCamera() {
    webrtcService.toggleVideo();
  }

  public async switchCamera() {
    webrtcService.switchCamera();
  }

  public getCurrentCall(): CallData | null {
    return this.callData;
  }

  public getCallStatus(): CallStatus {
    return this.callStatus;
  }

  public getDebugInfo(): {
    initialized: boolean;
    callStatus: CallStatus;
    currentUserId: string | null;
    socketId: string | null;
    socketConnected: boolean;
    registeredSocketId: string | null;
    listenerCount: Record<string, number>;
  } {
    return {
      initialized: this.initialized,
      callStatus: this.callStatus,
      currentUserId: this.currentUserId,
      socketId: socketService.getSocket()?.id || null,
      socketConnected: socketService.isSocketConnected(),
      registeredSocketId: this.registeredSocketId,
      listenerCount: Object.fromEntries(
        Object.entries(this.listeners).map(([k, v]) => [k, v.length])
      ),
    };
  }
}

export default new CallService();