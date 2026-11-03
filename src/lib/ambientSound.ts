/**
 * Procedural Web Audio API sound generator for Zen/Focus mode.
 * 100% self-contained, zero external network assets or MP3 dependencies.
 */

export type AmbientSoundType = 'rain' | 'coffee' | 'whitenoise' | 'none';

class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null;
  private currentType: AmbientSoundType = 'none';
  private gainNode: GainNode | null = null;
  private sourceNodes: (AudioNode | number)[] = [];
  private volume: number = 0.35;
  private isPlaying: boolean = false;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.05);
    }
  }

  public getCurrentType(): AmbientSoundType {
    return this.isPlaying ? this.currentType : 'none';
  }

  public stop() {
    this.sourceNodes.forEach((node) => {
      if (typeof node === 'number') {
        window.clearInterval(node);
      } else {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // Ignore disconnection errors on stopped nodes
        }
      }
    });
    this.sourceNodes = [];
    this.isPlaying = false;
    this.currentType = 'none';
  }

  public play(type: AmbientSoundType) {
    this.stop();
    if (type === 'none') return;

    this.initContext();
    if (!this.audioCtx) return;

    this.currentType = type;
    this.isPlaying = true;

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    this.gainNode.connect(this.audioCtx.destination);

    if (type === 'rain') {
      this.startRainSound();
    } else if (type === 'coffee') {
      this.startCoffeeAmbience();
    } else if (type === 'whitenoise') {
      this.startWhiteNoise();
    }
  }

  private startRainSound() {
    if (!this.audioCtx || !this.gainNode) return;

    // Buffer of pink noise (smoother than white noise, sounds like gentle rain)
    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Lowpass filter for deep soothing rainfall rumble
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, this.audioCtx.currentTime);

    // Highpass filter to eliminate harsh sub-bass hum
    const highpass = this.audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(150, this.audioCtx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(highpass);
    highpass.connect(this.gainNode);

    whiteNoise.start();
    this.sourceNodes.push(whiteNoise, filter, highpass);
  }

  private startCoffeeAmbience() {
    if (!this.audioCtx || !this.gainNode) return;

    // Gentle warm murmuring drone
    const bufferSize = this.audioCtx.sampleRate * 3;
    const noiseBuffer = this.audioCtx.createBuffer(2, bufferSize, this.audioCtx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = noiseBuffer.getChannelData(channel);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Warm brown-ish low rumble
        data[i] = (last + 0.02 * white) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const bandpass = this.audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(320, this.audioCtx.currentTime);
    bandpass.Q.setValueAtTime(0.8, this.audioCtx.currentTime);

    noise.connect(bandpass);
    bandpass.connect(this.gainNode);

    noise.start();
    this.sourceNodes.push(noise, bandpass);
  }

  private startWhiteNoise() {
    if (!this.audioCtx || !this.gainNode) return;

    const bufferSize = this.audioCtx.sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lowpass = this.audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1400, this.audioCtx.currentTime);

    noise.connect(lowpass);
    lowpass.connect(this.gainNode);

    noise.start();
    this.sourceNodes.push(noise, lowpass);
  }
}

export const ambientSound = new AmbientSoundEngine();
