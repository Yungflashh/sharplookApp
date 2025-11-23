export const webrtcHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { 
            margin: 0; 
            background: #000; 
            overflow: hidden; 
            width: 100vw; 
            height: 100vh; 
        }
        video { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
        }
        #localVideo { 
            position: absolute; 
            top: 20px; 
            right: 20px; 
            width: 120px; 
            height: 160px; 
            z-index: 10; 
            border-radius: 10px; 
            border: 2px solid white; 
            background: #1a1a1a;
        }
        #remoteVideo { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            z-index: 1; 
            background: #000;
        }
        #remoteAudio { 
            display: none; 
        }
    </style>
</head>
<body>
    <video id="remoteVideo" autoplay playsinline></video>
    <audio id="remoteAudio" autoplay playsinline></audio>
    <video id="localVideo" autoplay playsinline muted></video>

    <script>
        let peerConnection;
        let localStream;
        let remoteStream;
        
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const remoteAudio = document.getElementById('remoteAudio');

        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };

        function sendMessage(type, data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
            }
        }

        async function getLocalStream(isVideo) {
            try {
                console.log('🎥 Getting local stream - isVideo:', isVideo);
                
                const constraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: isVideo ? { 
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } : false
                };
                
                localStream = await navigator.mediaDevices.getUserMedia(constraints);
                
                // Display local video
                localVideo.srcObject = localStream;
                
                console.log('✅ Local stream obtained');
                console.log('   - Audio tracks:', localStream.getAudioTracks().length);
                console.log('   - Video tracks:', localStream.getVideoTracks().length);
                
                sendMessage('localStream', { 
                    id: localStream.id,
                    hasAudio: localStream.getAudioTracks().length > 0,
                    hasVideo: localStream.getVideoTracks().length > 0
                });
                
                return localStream;
            } catch (error) {
                console.error('❌ Error getting local stream:', error);
                sendMessage('error', { message: 'Error getting local stream: ' + error.message });
                throw error;
            }
        }

        async function createPeerConnection() {
            try {
                console.log('🔗 Creating peer connection');
                peerConnection = new RTCPeerConnection(configuration);

                // Handle ICE candidates
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('📤 Sending ICE candidate');
                        sendMessage('iceCandidate', event.candidate);
                    }
                };

                // Handle ICE connection state changes
                peerConnection.oniceconnectionstatechange = () => {
                    console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
                    if (peerConnection.iceConnectionState === 'connected') {
                        sendMessage('connectionState', { state: 'connected' });
                    } else if (peerConnection.iceConnectionState === 'failed') {
                        sendMessage('connectionState', { state: 'failed' });
                    }
                };

                // Handle incoming tracks
                peerConnection.ontrack = (event) => {
                    console.log('📥 Received remote track:', event.track.kind);
                    
                    if (event.streams && event.streams[0]) {
                        const stream = event.streams[0];
                        
                        console.log('✅ Remote stream received');
                        console.log('   - Audio tracks:', stream.getAudioTracks().length);
                        console.log('   - Video tracks:', stream.getVideoTracks().length);
                        
                        // Attach to both video and audio elements
                        if (event.track.kind === 'video') {
                            remoteVideo.srcObject = stream;
                            remoteVideo.play().catch(e => console.log('Video autoplay failed:', e));
                        } else if (event.track.kind === 'audio') {
                            remoteAudio.srcObject = stream;
                            remoteAudio.play().catch(e => console.log('Audio autoplay failed:', e));
                        }
                        
                        sendMessage('remoteStream', { 
                            id: stream.id,
                            hasAudio: stream.getAudioTracks().length > 0,
                            hasVideo: stream.getVideoTracks().length > 0
                        });
                    }
                };

                // Add local stream tracks to peer connection
                if (localStream) {
                    console.log('➕ Adding local tracks to peer connection');
                    localStream.getTracks().forEach(track => {
                        console.log('   - Adding track:', track.kind, 'enabled:', track.enabled);
                        peerConnection.addTrack(track, localStream);
                    });
                }

                console.log('✅ Peer connection created');
            } catch (error) {
                console.error('❌ Error creating peer connection:', error);
                sendMessage('error', { message: 'Error creating peer connection: ' + error.message });
                throw error;
            }
        }

        window.handleMessage = async (event) => {
            const { type, data } = JSON.parse(event.data);
            console.log('📨 Received message:', type);

            try {
                switch (type) {
                    case 'init':
                        console.log('🎬 Initializing with video:', data.isVideo);
                        await getLocalStream(data.isVideo);
                        await createPeerConnection();
                        break;
                    
                    case 'createOffer':
                        console.log('📤 Creating offer');
                        const offer = await peerConnection.createOffer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: true
                        });
                        await peerConnection.setLocalDescription(offer);
                        console.log('✅ Offer created and set as local description');
                        sendMessage('offer', offer);
                        break;

                    case 'createAnswer':
                        console.log('📥 Creating answer for received offer');
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                        console.log('✅ Remote description set');
                        
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        console.log('✅ Answer created and set as local description');
                        sendMessage('answer', answer);
                        break;

                    case 'handleAnswer':
                        console.log('📥 Handling received answer');
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                        console.log('✅ Remote description (answer) set');
                        break;

                    case 'addIceCandidate':
                        console.log('📥 Adding ICE candidate');
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                        console.log('✅ ICE candidate added');
                        break;

                    case 'toggleMute':
                        if (localStream) {
                            const audioTrack = localStream.getAudioTracks()[0];
                            if (audioTrack) {
                                audioTrack.enabled = !audioTrack.enabled;
                                console.log('🔇 Audio muted:', !audioTrack.enabled);
                                sendMessage('muteStatus', { muted: !audioTrack.enabled });
                            }
                        }
                        break;

                    case 'toggleVideo':
                        if (localStream) {
                            const videoTrack = localStream.getVideoTracks()[0];
                            if (videoTrack) {
                                videoTrack.enabled = !videoTrack.enabled;
                                console.log('📹 Video enabled:', videoTrack.enabled);
                                sendMessage('videoStatus', { enabled: videoTrack.enabled });
                            }
                        }
                        break;
                    
                    case 'switchCamera':
                        if (localStream) {
                            const videoTrack = localStream.getVideoTracks()[0];
                            if (videoTrack) {
                                // Get current facing mode
                                const currentFacingMode = videoTrack.getSettings().facingMode || 'user';
                                const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                                
                                console.log('🔄 Switching camera from', currentFacingMode, 'to', newFacingMode);
                                
                                // Stop current video track
                                videoTrack.stop();
                                
                                // Get new video stream with different facing mode
                                const newStream = await navigator.mediaDevices.getUserMedia({
                                    video: { facingMode: newFacingMode },
                                    audio: false
                                });
                                
                                const newVideoTrack = newStream.getVideoTracks()[0];
                                
                                // Replace track in peer connection
                                const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                                if (sender) {
                                    await sender.replaceTrack(newVideoTrack);
                                }
                                
                                // Update local stream
                                localStream.removeTrack(videoTrack);
                                localStream.addTrack(newVideoTrack);
                                localVideo.srcObject = localStream;
                                
                                console.log('✅ Camera switched successfully');
                            }
                        }
                        break;
                    
                    case 'endCall':
                        console.log('📞 Ending call');
                        if (localStream) {
                            localStream.getTracks().forEach(track => {
                                console.log('   - Stopping track:', track.kind);
                                track.stop();
                            });
                        }
                        if (peerConnection) {
                            peerConnection.close();
                        }
                        localVideo.srcObject = null;
                        remoteVideo.srcObject = null;
                        remoteAudio.srcObject = null;
                        console.log('✅ Call ended, all resources cleaned up');
                        break;
                }
            } catch (error) {
                console.error('❌ Error handling message:', error);
                sendMessage('error', { message: 'Error: ' + error.message });
            }
        };

        // Listen for messages from React Native
        document.addEventListener('message', window.handleMessage);
        window.addEventListener('message', window.handleMessage);

        console.log('🎬 WebRTC HTML loaded and ready');
    </script>
</body>
</html>
`;