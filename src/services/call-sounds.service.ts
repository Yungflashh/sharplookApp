import { Audio } from 'expo-av';

class CallSoundsService {
  private sounds: Audio.Sound[] = [];

  private async stopAndUnload(sound: Audio.Sound) {
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.stopAsync();
        }
        await sound.unloadAsync();
      }
    } catch (_) {}
  }

  async playRingtone() {
    this.stopAll();
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/ringtone.wav'),
        { shouldPlay: true, isLooping: true, volume: 0.8 }
      );
      this.sounds.push(sound);
    } catch (e) {
      console.warn('Error playing ringtone:', e);
    }
  }

  async playOutgoingRing() {
    this.stopAll();
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/outgoing_ring.wav'),
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );
      this.sounds.push(sound);
    } catch (e) {
      console.warn('Error playing outgoing ring:', e);
    }
  }

  async playConnected() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/call_connected.wav'),
        { shouldPlay: true, volume: 0.6 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.warn('Error playing connected sound:', e);
    }
  }

  async playHangup() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/call_ended.wav'),
        { shouldPlay: true, volume: 0.6 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.warn('Error playing hangup sound:', e);
    }
  }

  stopAll() {
    const toStop = [...this.sounds];
    this.sounds = [];
    toStop.forEach((sound) => this.stopAndUnload(sound));
  }
}

export default new CallSoundsService();
