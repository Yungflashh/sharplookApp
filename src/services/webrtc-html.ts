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
        let diagLog = [];

        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const remoteAudio = document.getElementById('remoteAudio');

        // TURN credentials are fetched dynamically from Metered API
        let configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
            iceCandidatePoolSize: 10
        };

        async function fetchTurnCredentials() {
            try {
                diag('TURN', 'Fetching TURN credentials from Metered API...');
                const response = await fetch('https://lookreal.metered.live/api/v1/turn/credentials?apiKey=22bf3000953ecd27e2ae6819fcde6fbd5f47');
                const iceServers = await response.json();
                if (iceServers && iceServers.length > 0) {
                    // Merge STUN + fetched TURN servers
                    configuration.iceServers = [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        ...iceServers
                    ];
                    diag('TURN', '✅ Got ' + iceServers.length + ' TURN servers');
                } else {
                    diag('TURN', '⚠️ API returned empty - using STUN only');
                }
            } catch (err) {
                diag('TURN', '❌ Failed to fetch: ' + err.message + ' - using STUN only');
                sendDiagReport('TURN Fetch Failed');
            }
        }

        // ── Diagnostic helpers ──────────────────────────────────────────────
        function diag(tag, msg) {
            var entry = '[' + tag + '] ' + msg;
            diagLog.push(entry);
            console.log(entry);
        }

        function sendMessage(type, data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
            }
        }

        // Send a diagnostic report to React Native (logged, no alert)
        function sendDiagReport(label) {
            sendMessage('diagnostic', { label: label, log: diagLog.slice(-30) });
        }
        // To re-enable alerts for debugging, change 'diagnostic' above to 'diagnosticAlert'

        async function getLocalStream(isVideo) {
            try {
                diag('MEDIA', 'Requesting media - video: ' + isVideo);
                diag('MEDIA', 'isSecureContext: ' + window.isSecureContext);
                diag('MEDIA', 'getUserMedia available: ' + !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('getUserMedia not available. isSecureContext=' + window.isSecureContext);
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
                localVideo.srcObject = localStream;

                var audioTracks = localStream.getAudioTracks();
                var videoTracks = localStream.getVideoTracks();
                diag('MEDIA', 'Local stream OK - audio tracks: ' + audioTracks.length + ', video tracks: ' + videoTracks.length);

                if (audioTracks.length > 0) {
                    var at = audioTracks[0];
                    diag('MEDIA', 'Audio track: enabled=' + at.enabled + ', muted=' + at.muted + ', readyState=' + at.readyState);
                } else {
                    diag('MEDIA', '⚠️ NO AUDIO TRACK - microphone may have been denied');
                }

                sendMessage('localStream', {
                    id: localStream.id,
                    hasAudio: audioTracks.length > 0,
                    hasVideo: videoTracks.length > 0
                });

                return localStream;
            } catch (error) {
                diag('MEDIA', '❌ FAILED: ' + error.message);
                sendMessage('error', { message: 'Error getting local stream: ' + error.message });
                sendDiagReport('Media Failed');
                throw error;
            }
        }

        async function createPeerConnection() {
            try {
                diag('PC', 'Creating PeerConnection');
                peerConnection = new RTCPeerConnection(configuration);

                var iceCandidateCount = 0;
                var iceTypes = {};

                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        iceCandidateCount++;
                        // Track candidate types (host/srflx/relay)
                        var type = event.candidate.type || 'unknown';
                        iceTypes[type] = (iceTypes[type] || 0) + 1;
                        sendMessage('iceCandidate', event.candidate);
                    } else {
                        // ICE gathering complete
                        diag('ICE', 'Gathering done - total: ' + iceCandidateCount + ', types: ' + JSON.stringify(iceTypes));
                        if (!iceTypes['relay']) {
                            diag('ICE', '⚠️ NO RELAY CANDIDATES - TURN server may be failing. Users behind strict NAT will have no audio.');
                        }
                    }
                };

                peerConnection.oniceconnectionstatechange = () => {
                    var state = peerConnection.iceConnectionState;
                    diag('ICE', 'Connection state: ' + state);
                    sendMessage('connectionState', { state: state });

                    if (state === 'failed') {
                        diag('ICE', '❌ ICE FAILED - attempting restart');
                        sendDiagReport('ICE Failed');
                        peerConnection.restartIce();
                    } else if (state === 'connected' || state === 'completed') {
                        // Report the selected candidate pair
                        try {
                            peerConnection.getStats().then(function(stats) {
                                stats.forEach(function(report) {
                                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                        diag('ICE', 'Active pair - local: ' + report.localCandidateId + ', remote: ' + report.remoteCandidateId);
                                    }
                                    if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
                                        if (report.candidateType) {
                                            diag('ICE', report.type + ': ' + report.candidateType + ' (' + (report.protocol || '') + ' ' + (report.address || report.ip || '') + ')');
                                        }
                                    }
                                });
                                sendDiagReport('ICE Connected');
                            });
                        } catch(e) {}
                    } else if (state === 'disconnected') {
                        sendMessage('connectionState', { state: 'disconnected' });
                    } else if (state === 'closed') {
                        sendMessage('connectionState', { state: 'closed' });
                    }
                };

                peerConnection.onconnectionstatechange = () => {
                    diag('PC', 'Connection state: ' + peerConnection.connectionState);
                    sendMessage('connectionState', { state: peerConnection.connectionState });
                };

                peerConnection.ontrack = (event) => {
                    diag('TRACK', 'Received remote track: ' + event.track.kind + ', readyState: ' + event.track.readyState + ', enabled: ' + event.track.enabled + ', muted: ' + event.track.muted);

                    var stream;
                    if (event.streams && event.streams[0]) {
                        stream = event.streams[0];
                        diag('TRACK', 'Got stream from event.streams[0]');
                    } else {
                        diag('TRACK', '⚠️ No stream in ontrack - building one manually');
                        if (!remoteStream) remoteStream = new MediaStream();
                        remoteStream.addTrack(event.track);
                        stream = remoteStream;
                    }

                    diag('TRACK', 'Remote stream - audio: ' + stream.getAudioTracks().length + ', video: ' + stream.getVideoTracks().length);

                    // Check audio track health
                    var remoteAudioTracks = stream.getAudioTracks();
                    if (remoteAudioTracks.length === 0) {
                        diag('TRACK', '❌ NO REMOTE AUDIO TRACKS - other side may not be sending audio');
                    } else {
                        var rat = remoteAudioTracks[0];
                        diag('TRACK', 'Remote audio: enabled=' + rat.enabled + ', muted=' + rat.muted + ', readyState=' + rat.readyState);
                        // Monitor if remote audio goes muted
                        rat.onmute = function() { diag('TRACK', '⚠️ Remote audio MUTED'); sendDiagReport('Remote Audio Muted'); };
                        rat.onunmute = function() { diag('TRACK', '✅ Remote audio UNMUTED'); };
                        rat.onended = function() { diag('TRACK', '❌ Remote audio track ENDED'); sendDiagReport('Remote Audio Ended'); };
                    }

                    remoteVideo.srcObject = stream;
                    remoteAudio.srcObject = stream;
                    remoteVideo.volume = 1.0;
                    remoteAudio.volume = 1.0;

                    function tryPlay(element, name, retries) {
                        retries = retries || 0;
                        element.play().then(function() {
                            diag('PLAY', name + ' playing OK (attempt ' + retries + ')');
                        }).catch(function(e) {
                            diag('PLAY', name + ' FAILED attempt ' + retries + ': ' + e.message);
                            if (retries < 5) {
                                setTimeout(function() { tryPlay(element, name, retries + 1); }, 500);
                            } else {
                                diag('PLAY', '❌ ' + name + ' GAVE UP after 5 retries');
                                sendDiagReport(name + ' Play Failed');
                            }
                        });
                    }
                    tryPlay(remoteVideo, 'Video', 0);
                    tryPlay(remoteAudio, 'Audio', 0);

                    sendMessage('remoteStream', {
                        id: stream.id,
                        hasAudio: stream.getAudioTracks().length > 0,
                        hasVideo: stream.getVideoTracks().length > 0
                    });

                    // After 3 seconds, do a health check on audio
                    setTimeout(function() {
                        if (!peerConnection) return;
                        var audioHealthLog = [];
                        try {
                            var raTracks = stream.getAudioTracks();
                            raTracks.forEach(function(t) {
                                audioHealthLog.push('track: enabled=' + t.enabled + ', muted=' + t.muted + ', readyState=' + t.readyState);
                            });
                            audioHealthLog.push('remoteAudio.paused=' + remoteAudio.paused);
                            audioHealthLog.push('remoteAudio.volume=' + remoteAudio.volume);
                            audioHealthLog.push('remoteAudio.muted=' + remoteAudio.muted);
                            audioHealthLog.push('remoteVideo.paused=' + remoteVideo.paused);

                            peerConnection.getStats().then(function(stats) {
                                stats.forEach(function(report) {
                                    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                                        audioHealthLog.push('inbound audio: packets=' + report.packetsReceived + ', bytes=' + report.bytesReceived + ', lost=' + report.packetsLost);
                                        if (report.packetsReceived === 0) {
                                            audioHealthLog.push('❌ ZERO PACKETS RECEIVED - audio is NOT flowing');
                                        } else {
                                            audioHealthLog.push('✅ Audio packets ARE flowing');
                                        }
                                    }
                                });
                                diag('HEALTH', 'Audio check: ' + audioHealthLog.join(' | '));
                            });
                        } catch(e) {
                            diag('HEALTH', 'Stats error: ' + e.message);
                        }
                    }, 3000);
                };

                if (localStream) {
                    diag('PC', 'Adding local tracks to PeerConnection');
                    localStream.getTracks().forEach(track => {
                        diag('PC', '  + ' + track.kind + ' enabled=' + track.enabled);
                        peerConnection.addTrack(track, localStream);
                    });
                } else {
                    diag('PC', '⚠️ No local stream when creating PeerConnection - tracks not added');
                }

                diag('PC', 'PeerConnection created OK');
            } catch (error) {
                diag('PC', '❌ FAILED: ' + error.message);
                sendMessage('error', { message: 'Error creating peer connection: ' + error.message });
                sendDiagReport('PeerConnection Failed');
                throw error;
            }
        }

        window.handleMessage = async (event) => {
            const { type, data } = JSON.parse(event.data);
            diag('MSG', 'Received: ' + type);

            try {
                switch (type) {
                    case 'init':
                        diag('INIT', 'Starting - video: ' + data.isVideo);
                        // Fetch fresh TURN credentials before anything else
                        await fetchTurnCredentials();
                        try {
                            await getLocalStream(data.isVideo);
                        } catch (streamError) {
                            diag('INIT', 'Media failed - continuing without local stream');
                            sendMessage('error', { message: 'Microphone/camera access failed: ' + streamError.message });
                        }
                        await createPeerConnection();
                        sendMessage('initComplete', {});
                        diag('INIT', 'Complete');
                        break;

                    case 'createOffer':
                        diag('SDP', 'Creating offer');
                        if (!peerConnection) {
                            sendMessage('error', { message: 'PeerConnection not initialized - media access may have failed' });
                            break;
                        }
                        const offer = await peerConnection.createOffer({
                            offerToReceiveAudio: true,
                            offerToReceiveVideo: true
                        });
                        await peerConnection.setLocalDescription(offer);
                        diag('SDP', 'Offer created + set as local desc');
                        sendMessage('offer', offer);
                        break;

                    case 'createAnswer':
                        diag('SDP', 'Creating answer');
                        if (!peerConnection) {
                            sendMessage('error', { message: 'PeerConnection not initialized - media access may have failed' });
                            break;
                        }
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                        hasRemoteDescription = true;
                        diag('SDP', 'Remote desc set');

                        if (pendingIceCandidates.length > 0) {
                            diag('ICE', 'Flushing ' + pendingIceCandidates.length + ' queued candidates');
                            for (const candidate of pendingIceCandidates) {
                                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                            }
                            pendingIceCandidates = [];
                        }

                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        diag('SDP', 'Answer created + set as local desc');
                        sendMessage('answer', answer);
                        break;

                    case 'handleAnswer':
                        diag('SDP', 'Handling answer');
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                        hasRemoteDescription = true;
                        diag('SDP', 'Remote desc (answer) set');

                        if (pendingIceCandidates.length > 0) {
                            diag('ICE', 'Flushing ' + pendingIceCandidates.length + ' queued candidates');
                            for (const candidate of pendingIceCandidates) {
                                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                            }
                            pendingIceCandidates = [];
                        }
                        break;

                    case 'addIceCandidate':
                        if (!peerConnection || !hasRemoteDescription) {
                            pendingIceCandidates.push(data.candidate);
                        } else {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                        }
                        break;

                    case 'toggleMute':
                        if (localStream) {
                            const audioTrack = localStream.getAudioTracks()[0];
                            if (audioTrack) {
                                audioTrack.enabled = !audioTrack.enabled;
                                diag('MUTE', 'Audio muted: ' + !audioTrack.enabled);
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
                        if (localStream) {
                            const videoTrack = localStream.getVideoTracks()[0];
                            if (videoTrack) {
                                const currentFacingMode = videoTrack.getSettings().facingMode || 'user';
                                const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                                videoTrack.stop();
                                const newStream = await navigator.mediaDevices.getUserMedia({
                                    video: { facingMode: newFacingMode },
                                    audio: false
                                });
                                const newVideoTrack = newStream.getVideoTracks()[0];
                                const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                                if (sender) {
                                    await sender.replaceTrack(newVideoTrack);
                                }
                                localStream.removeTrack(videoTrack);
                                localStream.addTrack(newVideoTrack);
                                localVideo.srcObject = localStream;
                            }
                        }
                        break;

                    case 'endCall':
                        diag('END', 'Ending call');
                        if (localStream) {
                            localStream.getTracks().forEach(track => {
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
                        break;
                }
            } catch (error) {
                diag('ERROR', type + ': ' + error.message);
                sendMessage('error', { message: 'Error: ' + error.message });
                sendDiagReport(type + ' Error');
            }
        };

        document.addEventListener('message', window.handleMessage);
        window.addEventListener('message', window.handleMessage);

        diag('INIT', 'WebRTC HTML loaded');
    </script>
</body>
</html>
`;
