

import socketService from './socket.service';
import webrtcService from './webrtc.service';

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface CallData {
  callId: string;
  type: CallType;
  caller: any;
  receiver: any;
  conversationId?: string;
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
      this.callData = {
        ...data.call,
        callId: data.call._id || data.call.id, // Store the ID as callId
      };
      console.log('   - Stored callId:', this.callData.callId);
      this.callStatus = 'calling';
      this.emit('call:initiated', data);
    });

    socketService.on('call:incoming', (data: any) => {
      console.log('📞 Incoming call:', data);
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

    socketService.on('call:accepted', (data: any) => {
      console.log('📞 Call accepted:', data);
      this.callStatus = 'connected';
      this.emit('call:accepted', data);
    });

    socketService.on('call:rejected', (data: any) => {
      console.log('📞 Call rejected:', data);
      this.endCall();
      this.emit('call:rejected', data);
    });

    socketService.on('call:ended', (data: any) => {
      console.log('📞 Call ended:', data);
      this.endCall();
      this.emit('call:ended', data);
    });

    socketService.on('call:cancelled', (data: any) => {
      console.log('📞 Call cancelled:', data);
      this.endCall();
      this.emit('call:cancelled', data);
    });

    socketService.on('call:busy', (data: any) => {
      console.log('📞 User busy:', data);
      this.endCall();
      this.emit('call:busy', data);
    });

    socketService.on('call:signal:offer', async (data: any) => {
      console.log('📞 Received offer:', data);
      webrtcService.createAnswer(data.offer);
    });

    socketService.on('call:signal:answer', async (data: any) => {
      console.log('📞 Received answer:', data);
      webrtcService.handleAnswer(data.answer);
    });

    socketService.on('call:signal:ice', async (data: any) => {
      console.log('📞 Received ICE candidate:', data);
      webrtcService.addIceCandidate(data.candidate);
    });
  }

  
  public async initiateCall(
    receiverId: string,
    type: CallType,
    offer?: any,
    conversationId?: string
  ) {
    try {
      console.log('📞 Initiating call:', { receiverId, type });

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
      this.callData.callId = callId;
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
    if (this.callData) {
      console.log('📞 Sending offer');
      socketService.emit('call:signal:offer', {
        callId: this.callData.callId,
        receiverId: this.callData.receiver._id,
        offer: offer,
      });
    }
  }

  public sendAnswer(answer: any) {
    if (this.callData) {
      console.log('📞 Sending answer');
      socketService.emit('call:signal:answer', {
        callId: this.callData.callId,
        callerId: this.callData.caller._id,
        answer: answer,
      });
    }
  }

  public sendIceCandidate(candidate: any) {
    if (this.callData) {
      console.log('📞 Sending ICE candidate');
      socketService.emit('call:signal:ice', {
        callId: this.callData.callId,
        receiverId: this.callData.receiver._id,
        candidate: candidate,
      });
    }
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