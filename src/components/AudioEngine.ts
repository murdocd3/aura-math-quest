// Web Audio API Sound Synthesizer for Retro 8-Bit SFX
// Provides clean procedural sounds without external asset dependencies.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private soundtrackInterval: any = null;
  private soundtrackStep: number = 0;

  private initContext() {
    if (!this.ctx) {
      // Create audio context lazily on user interaction to comply with browser policies
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.startSoundtrack();
    } else {
      this.stopSoundtrack();
    }
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  public startSoundtrack() {
    if (this.isMuted) return;
    if (this.soundtrackInterval) return;
    
    try {
      this.initContext();
      this.soundtrackStep = 0;
      
      const bassProgression = [130.81, 130.81, 155.56, 155.56, 196.00, 196.00, 174.61, 174.61]; // C3, C3, Eb3, Eb3, G3, G3, F3, F3
      const melodyProgression = [261.63, 0, 392.00, 0, 466.16, 0, 392.00, 349.23]; // C4, _, G4, _, Bb4, _, G4, F4
      
      this.soundtrackInterval = setInterval(() => {
        if (this.isMuted) return;
        
        const idx = this.soundtrackStep % 8;
        const bassFreq = bassProgression[idx];
        const melodyFreq = melodyProgression[idx];
        
        // Play bass note
        this.playTone([bassFreq], [0.75], 'triangle', [0.03, 0]);
        
        // Play melody note if any
        if (melodyFreq > 0) {
          this.playTone([melodyFreq], [0.35], 'sine', [0.015, 0]);
        }
        
        this.soundtrackStep++;
      }, 800);
      
      // No-op for soundtrack state
    } catch (e) {
      console.warn('Soundtrack failed to start:', e);
    }
  }

  public stopSoundtrack() {
    if (this.soundtrackInterval) {
      clearInterval(this.soundtrackInterval);
      this.soundtrackInterval = null;
    }
      // No-op for soundtrack state
  }

  private playTone(
    freqs: number[],
    durations: number[],
    type: OscillatorType = 'sine',
    gainValues: number[] = [0.1, 0]
  ) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      let time = ctx.currentTime;

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        // Gain envelope
        const duration = durations[idx] || 0.1;
        gainNode.gain.setValueAtTime(gainValues[0], time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + duration);

        time += duration * 0.8; // overlap notes slightly for chimes
      });
    } catch (e) {
      console.warn('Audio failed to play:', e);
    }
  }

  public playCorrect() {
    // Joyful major arpeggio
    // C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz)
    this.playTone([523.25, 659.25, 783.99], [0.1, 0.1, 0.25], 'triangle', [0.15, 0]);
  }

  public playCritical() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const time = ctx.currentTime;
      const duration = 0.35;

      // Custom Synth: Sweep Frequency Oscillator + Noise Filter
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, time);
      // Fast pitch slide upwards for critical hit
      osc.frequency.exponentialRampToValueAtTime(1500, time + duration);

      gainNode.gain.setValueAtTime(0.2, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    } catch (e) {
      console.warn('Critical sfx failed:', e);
    }
  }

  public playError() {
    // Harsh buzz descending
    // Sawtooth wave: G2 (98 Hz) -> Eb2 (77.78 Hz)
    this.playTone([98, 77.78], [0.15, 0.3], 'sawtooth', [0.2, 0]);
  }

  public playLevelUp() {
    // Grand fanfare
    // C5 (523Hz), G5 (783Hz), C6 (1046Hz), E6 (1318Hz), G6 (1567Hz)
    this.playTone(
      [523.25, 783.99, 1046.5, 1318.51, 1567.98],
      [0.08, 0.08, 0.08, 0.12, 0.4],
      'sine',
      [0.2, 0]
    );
  }

  public playHatchRoll() {
    // Quick ticking sound
    this.playTone([2000], [0.03], 'square', [0.05, 0]);
  }

  public playHatchSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const time = ctx.currentTime;

      // Magical retro chord
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C major chord
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gainNode.gain.setValueAtTime(0.08, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.6);
      });
    } catch (e) {
      console.warn('Hatch success sfx failed:', e);
    }
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
