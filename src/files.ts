import path from 'path';
import fs from 'fs/promises';
import type { Readable as NodeReadable } from 'stream';

export type Reading = NodeReadable;

const readStream = (stream: Reading): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

const file = async (
  voiceFilePath: string | Reading,
  givenFileName?: string,
  givenMime?: string
) => {
  let fileName;
  let file;

  if (typeof voiceFilePath === 'string') {
    file = await fs.readFile(voiceFilePath!);

    if (!givenFileName) {
      fileName = path.basename(voiceFilePath!);
    }
  } else {
    file = await readStream(voiceFilePath!);
    fileName = givenFileName;
  }

  if (!fileName) {
    throw new Error('File name was not provided');
  }

  const mime = givenMime
    ? { type: givenMime }
    : fileName.match(/\.wav$/)
      ? { type: 'audio/wav' }
      : { type: 'audio/mpeg' };

  const fileBlob = new Blob([file], mime);

  return [fileBlob, fileName] as const;
};

export const voiceFile = async (
  voiceFilePath: string | Reading,
  givenFileName?: string
) => {
  return file(voiceFilePath, givenFileName);
};

export const transcriptFile = async (
  transcriptFilePath: string | Reading,
  givenFileName?: string
) => {
  return file(transcriptFilePath, givenFileName, 'text/plain');
};
