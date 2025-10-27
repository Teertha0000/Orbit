import type { Blob } from '@google/genai';

// Base64 encoding
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 decoding
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom PCM audio decoder for raw audio streams.
// This function is designed to be robust against irregularly sized data chunks.
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const bytesPerSample = 2; // 16-bit PCM

  // 1. Calculate the total number of full 16-bit samples available in the buffer.
  const sampleCount = Math.floor(data.byteLength / bytesPerSample);

  if (sampleCount === 0) {
    return ctx.createBuffer(numChannels, 0, sampleRate);
  }

  // 2. Create an Int16Array VIEW directly on the original buffer's memory.
  // We specify the byte offset and the number of Int16 elements to include.
  // This is highly efficient as it avoids creating a data copy.
  const pcmData = new Int16Array(data.buffer, data.byteOffset, sampleCount);
  
  // 3. Calculate the number of full audio frames we can process.
  const frameCount = Math.floor(sampleCount / numChannels);

  if (frameCount === 0) {
      return ctx.createBuffer(numChannels, 0, sampleRate);
  }

  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  // 4. De-interleave the PCM data from the view into the AudioBuffer's channels.
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      const sampleIndex = i * numChannels + channel;
      // Normalize the 16-bit sample (range: -32768 to 32767) to a float in the range [-1.0, 1.0].
      channelData[i] = pcmData[sampleIndex] / 32768.0;
    }
  }

  return audioBuffer;
}


// Create a Blob in the format required by the Gemini Live API
export function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
