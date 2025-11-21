

 call:initiate
socket.emit('call:initiate', {
  receiverId: string,
  type: 'voice' | 'video',
  offer: RTCSessionDescriptionInit
});


call:accept
socket.emit('call:accept', {
  callId: string,
  answer: RTCSessionDescriptionInit
});

 call:reject
socket.emit('call:reject', callId: string);


call:end
socket.emit('call:end', callId: string);


call:cancel
socket.emit('call:cancel', callId: string);


call:busy
socket.emit('call:busy', callId: string);


call:missed
socket.emit('call:missed', callId: string);


call:ice-candidate
socket.emit('call:ice-candidate', {
  callId: string,
  candidate: RTCIceCandidate,
  targetUserId: string
});


call:toggle-video
socket.emit('call:toggle-video', {
  callId: string,
  videoEnabled: boolean,
  targetUserId: string
});

call:toggle-audio

socket.emit('call:toggle-audio', {
  callId: string,
  audioEnabled: boolean,
  targetUserId: string
});



routes/

GET

Get call history for authenticated user
calls/history
 Get active call for authenticated user
calls/active
Get call by ID
calls/:callId
Delete call from history
calls/:callId