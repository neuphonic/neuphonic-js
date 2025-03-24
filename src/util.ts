export const createWavHeader = (
  sampleRate: number,
  dataSize: number | null = null,
  numChannels = 1,
  bitsPerSample = 16
) => {
  const headerSize = 44;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const buffer = new ArrayBuffer(headerSize);
  const view = new DataView(buffer);

  let offset = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  function writeUint32(value: number) {
    view.setUint32(offset, value, true);
    offset += 4;
  }

  function writeUint16(value: number) {
    view.setUint16(offset, value, true);
    offset += 2;
  }

  // RIFF Header
  writeString('RIFF'); // ChunkID
  writeUint32(dataSize !== null ? dataSize + 36 : 0xffffffff); // ChunkSize (36 + Subchunk2Size or placeholder)
  writeString('WAVE'); // Format

  // fmt sub-chunk
  writeString('fmt '); // Subchunk1ID
  writeUint32(16); // Subchunk1Size (16 for PCM)
  writeUint16(1); // AudioFormat (1 = PCM)
  writeUint16(numChannels); // NumChannels
  writeUint32(sampleRate); // SampleRate
  writeUint32(byteRate); // ByteRate
  writeUint16(blockAlign); // BlockAlign
  writeUint16(bitsPerSample); // BitsPerSample

  // data sub-chunk
  writeString('data'); // Subchunk2ID
  writeUint32(dataSize !== null ? dataSize : 0xffffffff); // Subchunk2Size (or placeholder)

  return new Uint8Array(buffer);
};

export const toWav = (audioBytes: Uint8Array, sampleRate = 22050) => {
  const header = createWavHeader(sampleRate, audioBytes.length);

  const wavBuffer = new Uint8Array(audioBytes.byteLength + header.byteLength);

  wavBuffer.set(header);
  wavBuffer.set(audioBytes, header.byteLength);

  return wavBuffer;
};

export const createBuffer = (
  buffer: ArrayBufferLike,
  context: AudioContext,
  samplingRate: number = 44100
) => {
  const array = new Int16Array(buffer);
  const array2 = Array(array.length);
  
  for (let i = 0, length = array.length; i < length; i++) {
    array2[i] = (array[i] || 1) / 32768;
  }

  const buffer1 = context.createBuffer(1, buffer.byteLength / 2, samplingRate);
  buffer1.getChannelData(0).set(array2);
  
  return buffer1;
};
