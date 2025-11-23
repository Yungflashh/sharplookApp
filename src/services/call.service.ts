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

  public initialize() {
    this.setupSocketListeners();
    console.log('📞 Call service initialized');
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
      
      // ✅ Update the callData with real call ID and full data
      this.callData = {
        ...this.callData,
        ...data.call,
        callId: data.call._id || data.call.id,
      };
      console.log('   - Updated callId:', this.callData.callId);
      this.callStatus = 'calling';
      this.emit('call:initiated', data);
    });

    socketService.on('call:incoming', async (data: any) => {
   console.log('📞 Incoming call received - FULL DATA:', JSON.stringify(data, null, 2));
  console.log('   - Caller ID:', data.caller._id);
  console.log('   - Call type from data:', data.type);  // ⚠️ This should be 'video'!
  console.log('   - Call.type from call object:', data.call.type);  // ⚠️ Check this too!
  
  // ✅ Get current user ID to prevent receiving our own call
  try {
    const userDataString = await AsyncStorage.getItem('userData');
    console.log('   - UserData from storage:', userDataString ? 'Found' : 'Not found');
    
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      const currentUserId = userData._id || userData.id;
      console.log('   - Current user ID:', currentUserId);
      console.log('   - Comparing:', currentUserId, 'vs', data.caller._id);
      
      // ✅ Ignore if we're the caller (prevents receiving our own call)
      if (data.caller._id === currentUserId || data.caller.id === currentUserId) {
        console.log('⏭️ Ignoring our own outgoing call - IDs match!');
        return;
      }
    }
  } catch (error) {
    console.error('❌ Error getting user data:', error);
  }

  // Continue with normal incoming call handling...
  console.log('✅ Processing incoming call from another user');
  this.callData = {
    callId: data.call._id,
    type: data.type,  // ⚠️ Make sure this is the correct type!
    caller: data.caller,
    receiver: data.call.receiver,
    conversationId: data.conversationId,
  };
  this.callStatus = 'incoming';
  this.emit('call:incoming', data);
});
    socketService.on('call:accepted', (data: any) => {
      console.log('📞 Call accepted:', data);
      this.callStatus = 'connected';
      this.emit('call:accepted', data);
    });

    socketService.on('call:rejected', (data: any) => {
      console.log('📞 Call rejected:', data);
      this.emit('call:rejected', data);
    });

    socketService.on('call:ended', (data: any) => {
      console.log('📞 Call ended:', data);
      this.emit('call:ended', data);
    });

    socketService.on('call:cancelled', (data: any) => {
      console.log('📞 Call cancelled:', data);
      this.emit('call:cancelled', data);
    });

    socketService.on('call:busy', (data: any) => {
      console.log('📞 User busy:', data);
      this.emit('call:busy', data);
    });

    // ✅ WebRTC Signaling - Emit events instead of calling webrtcService directly
    socketService.on('call:signal:offer', async (data: any) => {
      console.log('📞 Received offer via socket:', data);
      
      // Store offer in callData
      if (this.callData) {
        this.callData.offer = data.offer;
      }
      
      // Emit to UI components
      this.emit('call:signal:offer', data);
    });

    socketService.on('call:signal:answer', async (data: any) => {
      console.log('📞 Received answer via socket:', data);
      
      // Emit to UI components
      this.emit('call:signal:answer', data);
    });

    socketService.on('call:signal:ice', async (data: any) => {
      console.log('📞 Received ICE candidate via socket:', data);
      
      // Emit to UI components
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
      console.log('📞 Initiating call:', { receiverId, type, hasOffer: !!offer });

      // ✅ Store temporary call data so we can send offer before getting call ID back
      this.callData = {
        callId: 'pending', // Temporary ID
        type: type,
        caller: null, // Will be filled by call:initiated
        receiver: { _id: receiverId },
        conversationId: conversationId,
      };
      console.log('   - Stored temporary callData');

      socketService.emit('call:initiate', {
        receiverId,
        type,
        offer,
        conversationId,
      });

      this.callStatus = 'calling';
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      throw error;
    }
  }

  public async acceptCall(callId: string, type: CallType) {
    try {
      console.log('📞 Accepting call:', callId);

      // Store callId so it can be used when ending the call
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

    // ✅ Determine receiverId based on call status
    // If we're calling (outgoing), send to receiver
    // If we're receiving (incoming), send to caller
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
    console.log('📞 [CallService] Ending call');
    console.log('   - Has callData:', !!this.callData);
    console.log('   - CallId:', this.callData?.callId);

    if (this.callData?.callId) {
      console.log('   - Emitting call:end event with callId:', this.callData.callId);
      socketService.emit('call:end', { callId: this.callData.callId });
    } else {
      console.warn('   ⚠️ No callId found, cannot emit call:end event');
    }

    console.log('   - Closing WebRTC service');
    webrtcService.close();

    console.log('   - Clearing callData');
    this.callData = null;
    this.callStatus = 'idle';
    console.log('✅ [CallService] Call ended');
  }

  public cancelCall(callId: string) {
    console.log('📞 Cancelling call:', callId);
    socketService.emit('call:cancel', { callId });
    this.endCall();
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
}

export default new CallService();