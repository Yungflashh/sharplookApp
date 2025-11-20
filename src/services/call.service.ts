

import socketService from './socket.service';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';

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
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private callData: CallData | null = null;
  private callStatus: CallStatus = 'idle';

  
  private configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  
  public initialize() {
    this.setupSocketListeners();
    console.log('📞 Call service initialized');
  }

  
  private setupSocketListeners() {
    
    socketService.on('call:initiated', (data: any) => {
      console.log('📞 Call initiated:', data);
      this.callData = data.call;
      this.callStatus = 'calling';
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
    });

    
    socketService.on('call:accepted', (data: any) => {
      console.log('📞 Call accepted:', data);
      this.callStatus = 'connected';
    });

    
    socketService.on('call:rejected', (data: any) => {
      console.log('📞 Call rejected:', data);
      this.endCall();
    });

    
    socketService.on('call:ended', (data: any) => {
      console.log('📞 Call ended:', data);
      this.endCall();
    });

    
    socketService.on('call:cancelled', (data: any) => {
      console.log('📞 Call cancelled:', data);
      this.endCall();
    });

    
    socketService.on('call:busy', (data: any) => {
      console.log('📞 User busy:', data);
      this.endCall();
    });

    
    socketService.on('call:signal:offer', async (data: any) => {
      console.log('📞 Received offer:', data);
      await this.handleOffer(data.offer, data.callId);
    });

    
    socketService.on('call:signal:answer', async (data: any) => {
      console.log('📞 Received answer:', data);
      await this.handleAnswer(data.answer);
    });

    
    socketService.on('call:signal:ice', async (data: any) => {
      console.log('📞 Received ICE candidate:', data);
      await this.handleIceCandidate(data.candidate);
    });
  }

  
  public async initiateCall(
    receiverId: string,
    type: CallType,
    conversationId?: string
  ) {
    try {
      console.log('📞 Initiating call:', { receiverId, type });

      
      await this.getLocalStream(type);

      
      socketService.emit('call:initiate', {
        receiverId,
        type,
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

      
      await this.getLocalStream(type);

      
      socketService.emit('call:accept', { callId });

      
      await this.setupPeerConnection();

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

  
  public endCall() {
    console.log('📞 Ending call');

    if (this.callData?.callId) {
      socketService.emit('call:end', { callId: this.callData.callId });
    }

    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
    }

    
    this.remoteStream = null;
    this.callData = null;
    this.callStatus = 'idle';
  }

  
  public cancelCall(callId: string) {
    console.log('📞 Cancelling call:', callId);
    socketService.emit('call:cancel', { callId });
    this.endCall();
  }

  
  private async getLocalStream(type: CallType) {
    try {
      const isFront = true;
      const constraints = {
        audio: true,
        video: type === 'video'
          ? {
              mandatory: {
                minWidth: 500,
                minHeight: 300,
                minFrameRate: 30,
              },
              facingMode: isFront ? 'user' : 'environment',
            }
          : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      console.log('✅ Got local stream:', stream.id);

      return stream;
    } catch (error) {
      console.error('❌ Error getting local stream:', error);
      throw error;
    }
  }

  
  private async setupPeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection(this.configuration);

      
      if (this.localStream) {
        this.localStream.getTracks().forEach((track: any) => {
          this.peerConnection!.addTrack(track, this.localStream);
        });
      }

      
      this.peerConnection.ontrack = (event: any) => {
        console.log('📞 Received remote track:', event);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
        }
      };

      
      this.peerConnection.onicecandidate = (event: any) => {
        if (event.candidate && this.callData) {
          console.log('📞 Sending ICE candidate');
          socketService.emit('call:signal:ice', {
            callId: this.callData.callId,
            receiverId: this.callData.receiver._id,
            candidate: event.candidate,
          });
        }
      };

      
      this.peerConnection.onconnectionstatechange = () => {
        console.log('📞 Connection state:', this.peerConnection?.connectionState);
      };

      
      if (this.callStatus === 'calling') {
        await this.createOffer();
      }

      console.log('✅ Peer connection setup complete');
    } catch (error) {
      console.error('❌ Error setting up peer connection:', error);
      throw error;
    }
  }

  
  private async createOffer() {
    try {
      if (!this.peerConnection || !this.callData) return;

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callData.type === 'video',
      });

      await this.peerConnection.setLocalDescription(offer);

      console.log('📞 Sending offer');
      socketService.emit('call:signal:offer', {
        callId: this.callData.callId,
        receiverId: this.callData.receiver._id,
        offer: offer,
      });
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      throw error;
    }
  }

  
  private async handleOffer(offer: any, callId: string) {
    try {
      if (!this.peerConnection) {
        await this.setupPeerConnection();
      }

      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      console.log('📞 Sending answer');
      socketService.emit('call:signal:answer', {
        callId: callId,
        callerId: this.callData?.caller._id,
        answer: answer,
      });
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      throw error;
    }
  }

  
  private async handleAnswer(answer: any) {
    try {
      if (!this.peerConnection) return;

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      console.log('✅ Answer handled');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      throw error;
    }
  }

  
  private async handleIceCandidate(candidate: any) {
    try {
      if (!this.peerConnection) return;

      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));

      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
      throw error;
    }
  }

  
  public toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  
  public toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  
  public async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack._switchCamera();
      }
    }
  }

  
  public getCurrentCall(): CallData | null {
    return this.callData;
  }

  
  public getCallStatus(): CallStatus {
    return this.callStatus;
  }

  
 

  
  public getRemoteStream() {
    return this.remoteStream;
  }
}

export default new CallService();