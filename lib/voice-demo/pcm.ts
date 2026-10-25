/** PCM16 helpers for the browser voice session. Linear16, little-endian. */

export function downsampleTo(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  if (fromRate <= 0 || toRate <= 0) return new Float32Array(0);
  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let n = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      n += 1;
    }
    out[i] = n ? sum / n : 0;
  }
  return out;
}

export function floatToPcm16(input: Float32Array): Uint8Array {
  const pcm = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
}

export function pcm16ToBase64(bytes: Uint8Array): string {
  let bin = "";
  const size = 0x2000;
  for (let i = 0; i < bytes.length; i += size) {
    const slice = bytes.subarray(i, i + size);
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin);
}

export function base64ToPcm16(b64: string): Int16Array {
  const bin = atob(b64);
  const even = bin.length - (bin.length % 2);
  const bytes = new Uint8Array(even);
  for (let i = 0; i < even; i++) bytes[i] = bin.charCodeAt(i);
  const aligned = new ArrayBuffer(even);
  new Uint8Array(aligned).set(bytes);
  return new Int16Array(aligned);
}
