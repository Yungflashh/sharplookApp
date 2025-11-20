// frontend/src/services/call.service.ts

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

  // WebRTC configuration
  private configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  /**
   * Initialize call service
   */
  public initialize() {
    this.setupSocketListeners();
    console.log('📞 Call service initialized');
  }

  /**
   * Setup socket listeners for call events
   */
  private setupSocketListeners() {
    // Call initiated
    socketService.on('call:initiated', (data: any) => {
      console.log('📞 Call initiated:', data);
      this.callData = data.call;
      this.callStatus = 'calling';
    });

    // Incoming call
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

    // Call accepted
    socketService.on('call:accepted', (data: any) => {
      console.log('📞 Call accepted:', data);
      this.callStatus = 'connected';
    });

    // Call rejected
    socketService.on('call:rejected', (data: any) => {
      console.log('📞 Call rejected:', data);
      this.endCall();
    });

    // Call ended
    socketService.on('call:ended', (data: any) => {
      console.log('📞 Call ended:', data);
      this.endCall();
    });

    // Call cancelled
    socketService.on('call:cancelled', (data: any) => {
      console.log('📞 Call cancelled:', data);
      this.endCall();
    });

    // Call busy
    socketService.on('call:busy', (data: any) => {
      console.log('📞 User busy:', data);
      this.endCall();
    });

    // WebRTC signaling - Offer
    socketService.on('call:signal:offer', async (data: any) => {
      console.log('📞 Received offer:', data);
      await this.handleOffer(data.offer, data.callId);
    });

    // WebRTC signaling - Answer
    socketService.on('call:signal:answer', async (data: any) => {
      console.log('📞 Received answer:', data);
      await this.handleAnswer(data.answer);
    });

    // WebRTC signaling - ICE candidate
    socketService.on('call:signal:ice', async (data: any) => {
      console.log('📞 Received ICE candidate:', data);
      await this.handleIceCandidate(data.candidate);
    });
  }

  /**
   * Initiate a call
   */
  public async initiateCall(
    receiverId: string,
    type: CallType,
    conversationId?: string
  ) {
    try {
      console.log('📞 Initiating call:', { receiverId, type });

      // Request media permissions
      await this.getLocalStream(type);

      // Emit call initiate event
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

  /**
   * Accept incoming call
   */
  public async acceptCall(callId: string, type: CallType) {
    try {
      console.log('📞 Accepting call:', callId);

      // Request media permissions
      await this.getLocalStream(type);

      // Emit call accept event
      socketService.emit('call:accept', { callId });

      // Setup peer connection
      await this.setupPeerConnection();

      this.callStatus = 'connected';
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      throw error;
    }
  }

  /**
   * Reject incoming call
   */
  public rejectCall(callId: string) {
    console.log('📞 Rejecting call:', callId);
    socketService.emit('call:reject', { callId });
    this.endCall();
  }

  /**
   * End ongoing call
   */
  public endCall() {
    console.log('📞 Ending call');

    if (this.callData?.callId) {
      socketService.emit('call:end', { callId: this.callData.callId });
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;
    this.callData = null;
    this.callStatus = 'idle';
  }

  /**
   * Cancel outgoing call
   */
  public cancelCall(callId: string) {
    console.log('📞 Cancelling call:', callId);
    socketService.emit('call:cancel', { callId });
    this.endCall();
  }

  /**
   * Get local media stream
   */
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

  /**
   * Setup WebRTC peer connection
   */
  private async setupPeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection(this.configuration);

      // Add local stream tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach((track: any) => {
          this.peerConnection!.addTrack(track, this.localStream);
        });
      }

      // Handle remote stream
      this.peerConnection.ontrack = (event: any) => {
        console.log('📞 Received remote track:', event);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
        }
      };

      // Handle ICE candidates
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

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('📞 Connection state:', this.peerConnection?.connectionState);
      };

      // Create and send offer if caller
      if (this.callStatus === 'calling') {
        await this.createOffer();
      }

      console.log('✅ Peer connection setup complete');
    } catch (error) {
      console.error('❌ Error setting up peer connection:', error);
      throw error;
    }
  }

  /**
   * Create WebRTC offer
   */
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

  /**
   * Handle WebRTC offer
   */
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

  /**
   * Handle WebRTC answer
   */
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

  /**
   * Handle ICE candidate
   */
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

  /**
   * Toggle mute
   */
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

  /**
   * Toggle camera (for video calls)
   */
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

  /**
   * Switch camera (front/back)
   */
  public async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack._switchCamera();
      }
    }
  }

  /**
   * Get current call data
   */
  public getCurrentCall(): CallData | null {
    return this.callData;
  }

  /**
   * Get call status
   */
  public getCallStatus(): CallStatus {
    return this.callStatus;
  }

  
 

  /**
   * Get remote stream
   */
  public getRemoteStream() {
    return this.remoteStream;
  }
}

export default new CallService();