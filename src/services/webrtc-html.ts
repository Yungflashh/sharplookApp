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
        let pendingIceCandidates = [];
        let hasRemoteDescription = false;

        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const remoteAudio = document.getElementById('remoteAudio');

        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                {
                    urls: 'turn:a.relay.metered.ca:80',
                    username: 'e8dd65b92f6de1da0c2bf5b6',
                    credential: 'VhacMpSx/TM+Fpn+'
                },
                {
                    urls: 'turn:a.relay.metered.ca:80?transport=tcp',
                    username: 'e8dd65b92f6de1da0c2bf5b6',
                    credential: 'VhacMpSx/TM+Fpn+'
                },
                {
                    urls: 'turn:a.relay.metered.ca:443',
                    username: 'e8dd65b92f6de1da0c2bf5b6',
                    credential: 'VhacMpSx/TM+Fpn+'
                },
                {
                    urls: 'turns:a.relay.metered.ca:443?transport=tcp',
                    username: 'e8dd65b92f6de1da0c2bf5b6',
                    credential: 'VhacMpSx/TM+Fpn+'
                }
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
                console.log('Getting local stream - isVideo:', isVideo);
                console.log('isSecureContext:', window.isSecureContext);
                console.log('navigator.mediaDevices:', !!navigator.mediaDevices);

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('getUserMedia not available. isSecureContext=' + window.isSecureContext + '. WebView may need HTTPS baseUrl.');
                }

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
                    console.log('ICE connection state:', peerConnection.iceConnectionState);
                    sendMessage('connectionState', { state: peerConnection.iceConnectionState });
                    if (peerConnection.iceConnectionState === 'failed') {
                        console.log('ICE failed, attempting restart...');
                        peerConnection.restartIce();
                    } else if (peerConnection.iceConnectionState === 'disconnected') {
                        sendMessage('connectionState', { state: 'disconnected' });
                    } else if (peerConnection.iceConnectionState === 'closed') {
                        sendMessage('connectionState', { state: 'closed' });
                    }
                };

                // Handle connection state (more reliable than ICE state on some browsers)
                peerConnection.onconnectionstatechange = () => {
                    console.log('Connection state:', peerConnection.connectionState);
                    sendMessage('connectionState', { state: peerConnection.connectionState });
                };

                // Handle incoming tracks
                peerConnection.ontrack = (event) => {
                    console.log('📥 Received remote track:', event.track.kind);

                    if (event.streams && event.streams[0]) {
                        const stream = event.streams[0];

                        console.log('✅ Remote stream received');
                        console.log('   - Audio tracks:', stream.getAudioTracks().length);
                        console.log('   - Video tracks:', stream.getVideoTracks().length);

                        // Always attach the full stream to both elements for reliability
                        remoteVideo.srcObject = stream;
                        remoteAudio.srcObject = stream;

                        // Ensure playback starts (with retry for autoplay restrictions)
                        function tryPlay(element, name) {
                            element.play().then(() => {
                                console.log(name + ' playing successfully');
                            }).catch(e => {
                                console.log(name + ' autoplay failed, retrying in 500ms:', e);
                                setTimeout(() => {
                                    element.play().catch(e2 => console.log(name + ' retry also failed:', e2));
                                }, 500);
                            });
                        }
                        tryPlay(remoteVideo, 'Video');
                        tryPlay(remoteAudio, 'Audio');

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
                        console.log('Initializing with video:', data.isVideo);
                        try {
                            await getLocalStream(data.isVideo);
                        } catch (streamError) {
                            console.error('Failed to get local stream:', streamError);
                            sendMessage('error', { message: 'Microphone/camera access failed: ' + streamError.message });
                        }
                        await createPeerConnection();
                        sendMessage('initComplete', {});
                        break;
                    
                    case 'createOffer':
                        console.log('Creating offer');
                        if (!peerConnection) {
                            sendMessage('error', { message: 'PeerConnection not initialized - media access may have failed' });
                            break;
                        }
                        const offer = await peerConnection.createOffer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: true
                        });
                        await peerConnection.setLocalDescription(offer);
                        console.log('✅ Offer created and set as local description');
                        sendMessage('offer', offer);
                        break;

                    case 'createAnswer':
                        console.log('Creating answer for received offer');
                        if (!peerConnection) {
                            sendMessage('error', { message: 'PeerConnection not initialized - media access may have failed' });
                            break;
                        }
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                        hasRemoteDescription = true;
                        console.log('✅ Remote description set');

                        // Flush any queued ICE candidates
                        if (pendingIceCandidates.length > 0) {
                            console.log('📥 Flushing ' + pendingIceCandidates.length + ' queued ICE candidates');
                            for (const candidate of pendingIceCandidates) {
                                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                            }
                            pendingIceCandidates = [];
                        }

                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        console.log('✅ Answer created and set as local description');
                        sendMessage('answer', answer);
                        break;

                    case 'handleAnswer':
                        console.log('📥 Handling received answer');
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                        hasRemoteDescription = true;
                        console.log('✅ Remote description (answer) set');

                        // Flush any queued ICE candidates
                        if (pendingIceCandidates.length > 0) {
                            console.log('📥 Flushing ' + pendingIceCandidates.length + ' queued ICE candidates');
                            for (const candidate of pendingIceCandidates) {
                                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                            }
                            pendingIceCandidates = [];
                        }
                        break;

                    case 'addIceCandidate':
                        if (!peerConnection || !hasRemoteDescription) {
                            console.log('📥 Queuing ICE candidate (remote description not set yet)');
                            pendingIceCandidates.push(data.candidate);
                        } else {
                            console.log('📥 Adding ICE candidate');
                            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                            console.log('✅ ICE candidate added');
                        }
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
                            localStream = null;
                        }
                        if (peerConnection) {
                            peerConnection.close();
                            peerConnection = null;
                        }
                        localVideo.srcObject = null;
                        remoteVideo.srcObject = null;
                        remoteAudio.srcObject = null;
                        pendingIceCandidates = [];
                        hasRemoteDescription = false;
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