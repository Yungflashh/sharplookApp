// // frontend/src/services/webrtc.service.ts

// import {
//   RTCPeerConnection,
//   RTCSessionDescription,
//   RTCIceCandidate,
//   mediaDevices,
//   MediaStream,
// } from 'react-native-webrtc';

// class WebRTCService {
//   private peerConnection: RTCPeerConnection | null = null;
//   private localStream: MediaStream | null = null;
//   private remoteStream: MediaStream | null = null;

//   // STUN/TURN servers configuration
//   private configuration = {
//     iceServers: [
//       { urls: 'stun:stun.l.google.com:19302' },
//       { urls: 'stun:stun1.l.google.com:19302' },
//       { urls: 'stun:stun2.l.google.com:19302' },
//       { urls: 'stun:stun3.l.google.com:19302' },
//       { urls: 'stun:stun4.l.google.com:19302' },
//     ],
//   };

//   /**
//    * Initialize WebRTC peer connection
//    */
//   public async initializePeerConnection(
//     onIceCandidate: (candidate: RTCIceCandidate) => void,
//     onTrack: (stream: MediaStream) => void
//   ): Promise<RTCPeerConnection> {
//     console.log('🔌 Initializing peer connection');

//     this.peerConnection = new RTCPeerConnection(this.configuration);

//     // Handle ICE candidates
//     this.peerConnection.onicecandidate = (event) => {
//       if (event.candidate) {
//         console.log('🧊 ICE candidate generated');
//         onIceCandidate(event.candidate);
//       }
//     };

//     // Handle remote stream
//     this.peerConnection.ontrack = (event) => {
//       console.log('📹 Remote track received');
//       if (event.streams && event.streams[0]) {
//         this.remoteStream = event.streams[0];
//         onTrack(event.streams[0]);
//       }
//     };

//     // Handle connection state changes
//     this.peerConnection.onconnectionstatechange = () => {
//       console.log('🔄 Connection state:', this.peerConnection?.connectionState);
//     };

//     // Handle ICE connection state
//     this.peerConnection.oniceconnectionstatechange = () => {
//       console.log('🧊 ICE connection state:', this.peerConnection?.iceConnectionState);
//     };

//     console.log('✅ Peer connection initialized');

//     return this.peerConnection;
//   }

//   /**
//    * Get local media stream
//    */
//   public async getLocalStream(
//     isVideoCall: boolean = false
//   ): Promise<MediaStream> {
//     try {
//       console.log('🎥 Getting local stream');
//       console.log('   Video:', isVideoCall);

//       const constraints = {
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//         },
//         video: isVideoCall
//           ? {
//               facingMode: 'user',
//               width: { ideal: 1280 },
//               height: { ideal: 720 },
//               frameRate: { ideal: 30 },
//             }
//           : false,
//       };

//       this.localStream = await mediaDevices.getUserMedia(constraints);

//       console.log('✅ Local stream obtained');
//       console.log('   Stream ID:', this.localStream.id);
//       console.log('   Audio tracks:', this.localStream.getAudioTracks().length);
//       console.log('   Video tracks:', this.localStream.getVideoTracks().length);

//       return this.localStream;
//     } catch (error) {
//       console.error('❌ Error getting local stream:', error);
//       throw error;
//     }
//   }

//   /**
//    * Add local stream to peer connection
//    */
//   public addLocalStreamToPeer(): void {
//     if (!this.localStream || !this.peerConnection) {
//       console.error('❌ Local stream or peer connection not initialized');
//       return;
//     }

//     console.log('➕ Adding local stream to peer connection');

//     this.localStream.getTracks().forEach((track) => {
//       this.peerConnection!.addTrack(track, this.localStream!);
//       console.log('  ✅ Added track:', track.kind);
//     });
//   }

//   /**
//    * Create WebRTC offer
//    */
//   public async createOffer(): Promise<RTCSessionDescription> {
//     if (!this.peerConnection) {
//       throw new Error('Peer connection not initialized');
//     }

//     console.log('📝 Creating offer');

//     const offer = await this.peerConnection.createOffer({
//       offerToReceiveAudio: true,
//       offerToReceiveVideo: true,
//     });

//     await this.peerConnection.setLocalDescription(offer);

//     console.log('✅ Offer created and set as local description');

//     return offer;
//   }

//   /**
//    * Create WebRTC answer
//    */
//   public async createAnswer(): Promise<RTCSessionDescription> {
//     if (!this.peerConnection) {
//       throw new Error('Peer connection not initialized');
//     }

//     console.log('📝 Creating answer');

//     const answer = await this.peerConnection.createAnswer();

//     await this.peerConnection.setLocalDescription(answer);

//     console.log('✅ Answer created and set as local description');

//     return answer;
//   }

//   /**
//    * Set remote description
//    */
//   public async setRemoteDescription(
//     description: RTCSessionDescription
//   ): Promise<void> {
//     if (!this.peerConnection) {
//       throw new Error('Peer connection not initialized');
//     }

//     console.log('📥 Setting remote description');
//     console.log('   Type:', description.type);

//     await this.peerConnection.setRemoteDescription(
//       new RTCSessionDescription(description)
//     );

//     console.log('✅ Remote description set');
//   }

//   /**
//    * Add ICE candidate
//    */
//   public async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
//     if (!this.peerConnection) {
//       throw new Error('Peer connection not initialized');
//     }

//     console.log('🧊 Adding ICE candidate');

//     await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));

//     console.log('✅ ICE candidate added');
//   }

//   /**
//    * Toggle microphone mute
//    */
//   public toggleMute(): boolean {
//     if (!this.localStream) {
//       console.warn('⚠️ No local stream to mute');
//       return false;
//     }

//     const audioTrack = this.localStream.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       console.log('🎤 Microphone:', audioTrack.enabled ? 'unmuted' : 'muted');
//       return !audioTrack.enabled; // Return true if muted
//     }

//     return false;
//   }

//   /**
//    * Toggle video (for video calls)
//    */
//   public toggleVideo(): boolean {
//     if (!this.localStream) {
//       console.warn('⚠️ No local stream to toggle video');
//       return false;
//     }

//     const videoTrack = this.localStream.getVideoTracks()[0];
//     if (videoTrack) {
//       videoTrack.enabled = !videoTrack.enabled;
//       console.log('📹 Video:', videoTrack.enabled ? 'enabled' : 'disabled');
//       return !videoTrack.enabled; // Return true if video off
//     }

//     return false;
//   }

//   /**
//    * Switch camera (front/back)
//    */
//   public switchCamera(): void {
//     if (!this.localStream) {
//       console.warn('⚠️ No local stream to switch camera');
//       return;
//     }

//     const videoTrack = this.localStream.getVideoTracks()[0];
//     if (videoTrack) {
//       console.log('🔄 Switching camera');
//       // @ts-ignore - _switchCamera is a React Native WebRTC specific method
//       videoTrack._switchCamera();
//     }
//   }

//   /**
//    * Get local stream
//    */
//   public getLocalStream(): MediaStream | null {
//     return this.localStream;
//   }

//   /**
//    * Get remote stream
//    */
//   public getRemoteStream(): MediaStream | null {
//     return this.remoteStream;
//   }

//   /**
//    * Get peer connection
//    */
//   public getPeerConnection(): RTCPeerConnection | null {
//     return this.peerConnection;
//   }

//   /**
//    * Close peer connection and stop streams
//    */
//   public close(): void {
//     console.log('🛑 Closing WebRTC connection');

//     // Stop local stream
//     if (this.localStream) {
//       this.localStream.getTracks().forEach((track) => {
//         track.stop();
//         console.log('  ⏹️ Stopped track:', track.kind);
//       });
//       this.localStream = null;
//     }

//     // Close peer connection
//     if (this.peerConnection) {
//       this.peerConnection.close();
//       this.peerConnection = null;
//     }

//     // Clear remote stream
//     this.remoteStream = null;

//     console.log('✅ WebRTC connection closed');
//   }

//   /**
//    * Check if peer connection is connected
//    */
//   public isConnected(): boolean {
//     return (
//       this.peerConnection?.connectionState === 'connected' ||
//       this.peerConnection?.iceConnectionState === 'connected'
//     );
//   }

//   /**
//    * Get connection stats
//    */
//   public async getStats(): Promise<any> {
//     if (!this.peerConnection) {
//       return null;
//     }

//     try {
//       const stats = await this.peerConnection.getStats();
//       return stats;
//     } catch (error) {
//       console.error('❌ Error getting stats:', error);
//       return null;
//     }
//   }
// }

// export default new WebRTCService();