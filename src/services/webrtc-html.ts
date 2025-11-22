export const webrtcHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { margin: 0; background: #000; overflow: hidden; width: 100vw; height: 100vh; }
        video { width: 100%; height: 100%; object-fit: cover; }
        #localVideo { position: absolute; top: 20px; right: 20px; width: 100px; height: 150px; z-index: 2; border-radius: 10px; border: 2px solid white; }
        #remoteVideo { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
        #remoteAudio { display: none; }
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
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        function sendMessage(type, data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
            }
        }

        async function getLocalStream(isVideo) {
            try {
                const constraints = {
                    audio: true,
                    video: isVideo ? { facingMode: 'user' } : false
                };
                localStream = await navigator.mediaDevices.getUserMedia(constraints);
                localVideo.srcObject = localStream;
                sendMessage('localStream', { id: localStream.id });
                return localStream;
            } catch (error) {
                sendMessage('error', { message: 'Error getting local stream: ' + error.message });
            }
        }

        async function createPeerConnection() {
            peerConnection = new RTCPeerConnection(configuration);

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    sendMessage('iceCandidate', event.candidate);
                }
            };

            peerConnection.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    // Attach to both video and audio elements for better compatibility
                    remoteVideo.srcObject = event.streams[0];
                    remoteAudio.srcObject = event.streams[0];
                    
                    // Ensure autoplay works
                    remoteVideo.play().catch(e => console.log('Video autoplay failed:', e));
                    remoteAudio.play().catch(e => console.log('Audio autoplay failed:', e));
                    
                    sendMessage('remoteStream', { id: event.streams[0].id });
                }
            };

            if (localStream) {
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
            }
        }

        window.handleMessage = async (event) => {
            const { type, data } = JSON.parse(event.data);

            switch (type) {
                case 'init':
                    await getLocalStream(data.isVideo);
                    await createPeerConnection();
                    break;
                
                case 'createOffer':
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    sendMessage('offer', offer);
                    break;

                case 'createAnswer':
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    sendMessage('answer', answer);
                    break;

                case 'handleAnswer':
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                    break;

                case 'addIceCandidate':
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    break;

                case 'toggleMute':
                    if (localStream) {
                        const audioTrack = localStream.getAudioTracks()[0];
                        if (audioTrack) {
                            audioTrack.enabled = !audioTrack.enabled;
                            sendMessage('muteStatus', { muted: !audioTrack.enabled });
                        }
                    }
                    break;

                case 'toggleVideo':
                    if (localStream) {
                        const videoTrack = localStream.getVideoTracks()[0];
                        if (videoTrack) {
                            videoTrack.enabled = !videoTrack.enabled;
                            sendMessage('videoStatus', { enabled: videoTrack.enabled });
                        }
                    }
                    break;
                
                case 'switchCamera':
                    // Switching camera in WebView is tricky as we need to re-request stream with different facingMode
                    // For now, we might skip or implement basic toggle
                    break;
                
                case 'endCall':
                    if (localStream) {
                        localStream.getTracks().forEach(track => track.stop());
                    }
                    if (peerConnection) {
                        peerConnection.close();
                    }
                    break;
            }
        };

        // Listen for messages from React Native
        document.addEventListener('message', window.handleMessage);
        window.addEventListener('message', window.handleMessage);
    </script>
</body>
</html>
`;
