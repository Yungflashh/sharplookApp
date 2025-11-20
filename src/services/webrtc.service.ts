

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  
  private configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  };

  
  public async initializePeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void
  ): Promise<RTCPeerConnection> {
    console.log('🔌 Initializing peer connection');

    this.peerConnection = new RTCPeerConnection(this.configuration);

    
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated');
        onIceCandidate(event.candidate);
      }
    };

    
    this.peerConnection.ontrack = (event) => {
      console.log('📹 Remote track received');
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        onTrack(event.streams[0]);
      }
    };

    
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔄 Connection state:', this.peerConnection?.connectionState);
    };

    
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', this.peerConnection?.iceConnectionState);
    };

    console.log('✅ Peer connection initialized');

    return this.peerConnection;
  }

  
  public async getLocalStream(
    isVideoCall: boolean = false
  ): Promise<MediaStream> {
    try {
      console.log('🎥 Getting local stream');
      console.log('   Video:', isVideoCall);

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideoCall
          ? {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);

      console.log('✅ Local stream obtained');
      console.log('   Stream ID:', this.localStream.id);
      console.log('   Audio tracks:', this.localStream.getAudioTracks().length);
      console.log('   Video tracks:', this.localStream.getVideoTracks().length);

      return this.localStream;
    } catch (error) {
      console.error('❌ Error getting local stream:', error);
      throw error;
    }
  }

  
  public addLocalStreamToPeer(): void {
    if (!this.localStream || !this.peerConnection) {
      console.error('❌ Local stream or peer connection not initialized');
      return;
    }

    console.log('➕ Adding local stream to peer connection');

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.localStream!);
      console.log('  ✅ Added track:', track.kind);
    });
  }

  
  public async createOffer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('📝 Creating offer');

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);

    console.log('✅ Offer created and set as local description');

    return offer;
  }

  
  public async createAnswer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('📝 Creating answer');

    const answer = await this.peerConnection.createAnswer();

    await this.peerConnection.setLocalDescription(answer);

    console.log('✅ Answer created and set as local description');

    return answer;
  }

  
  public async setRemoteDescription(
    description: RTCSessionDescription
  ): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('📥 Setting remote description');
    console.log('   Type:', description.type);

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );

    console.log('✅ Remote description set');
  }

  
  public async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('🧊 Adding ICE candidate');

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));

    console.log('✅ ICE candidate added');
  }

  
  public toggleMute(): boolean {
    if (!this.localStream) {
      console.warn('⚠️ No local stream to mute');
      return false;
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('🎤 Microphone:', audioTrack.enabled ? 'unmuted' : 'muted');
      return !audioTrack.enabled; 
    }

    return false;
  }

  
  public toggleVideo(): boolean {
    if (!this.localStream) {
      console.warn('⚠️ No local stream to toggle video');
      return false;
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('📹 Video:', videoTrack.enabled ? 'enabled' : 'disabled');
      return !videoTrack.enabled; 
    }

    return false;
  }

  
  public switchCamera(): void {
    if (!this.localStream) {
      console.warn('⚠️ No local stream to switch camera');
      return;
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      console.log('🔄 Switching camera');
      
      videoTrack._switchCamera();
    }
  }

  
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  
  public getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  
  public close(): void {
    console.log('🛑 Closing WebRTC connection');

    
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log('  ⏹️ Stopped track:', track.kind);
      });
      this.localStream = null;
    }

    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    
    this.remoteStream = null;

    console.log('✅ WebRTC connection closed');
  }

  
  public isConnected(): boolean {
    return (
      this.peerConnection?.connectionState === 'connected' ||
      this.peerConnection?.iceConnectionState === 'connected'
    );
  }

  
  public async getStats(): Promise<any> {
    if (!this.peerConnection) {
      return null;
    }

    try {
      const stats = await this.peerConnection.getStats();
      return stats;
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return null;
    }
  }
}

export default new WebRTCService();