

import { WebView } from 'react-native-webview';

type WebRTCEvent = 
  | { type: 'localStream'; data: { id: string } }
  | { type: 'remoteStream'; data: { id: string } }
  | { type: 'iceCandidate'; data: any }
  | { type: 'offer'; data: any }
  | { type: 'answer'; data: any }
  | { type: 'error'; data: { message: string } }
  | { type: 'muteStatus'; data: { muted: boolean } }
  | { type: 'videoStatus'; data: { enabled: boolean } };

class WebRTCService {
  private webviewRef: WebView | null = null;
  private onMessageCallback: ((event: WebRTCEvent) => void) | null = null;

  public setWebViewRef(ref: WebView | null) {
    this.webviewRef = ref;
  }

  public setOnMessageCallback(callback: (event: WebRTCEvent) => void) {
    this.onMessageCallback = callback;
  }

  public handleWebViewMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (this.onMessageCallback) {
        this.onMessageCallback(data);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }

  private postMessage(type: string, data: any = {}) {
    if (this.webviewRef) {
      const script = `window.handleMessage({ data: JSON.stringify({ type: '${type}', data: ${JSON.stringify(data)} }) })`;
      this.webviewRef.injectJavaScript(script);
    }
  }

  public initialize(isVideo: boolean) {
    this.postMessage('init', { isVideo });
  }

  public createOffer() {
    this.postMessage('createOffer');
  }

  public createAnswer(offer: any) {
    this.postMessage('createAnswer', { offer });
  }

  public handleAnswer(answer: any) {
    this.postMessage('handleAnswer', { answer });
  }

  public addIceCandidate(candidate: any) {
    this.postMessage('addIceCandidate', { candidate });
  }

  public toggleMute() {
    this.postMessage('toggleMute');
  }

  public toggleVideo() {
    this.postMessage('toggleVideo');
  }

  public switchCamera() {
    this.postMessage('switchCamera');
  }

  public close() {
    if (this.webviewRef) {
      this.postMessage('endCall');
    }
    this.webviewRef = null;
    this.onMessageCallback = null;
  }
}

export default new WebRTCService();