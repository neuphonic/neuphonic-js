import path from 'path';
import fs from 'fs/promises';

export const voiceFile = async (voiceFilePath: string) => {
  const fileName = path.basename(voiceFilePath);
  const mime = fileName.match(/\.wav$/)
    ? { type: 'audio/wav' }
    : { type: 'audio/mpeg' };

  const file = await fs.readFile(voiceFilePath);
  const fileBlob = new Blob([file], mime);

  return [fileBlob, fileName] as const;
};


export const transcriptFile = async (transcriptFilePath: string) => {
  const fileName = path.basename(transcriptFilePath);

  const file = await fs.readFile(transcriptFilePath);
  const fileBlob = new Blob([file], { type: 'text/plain' });

  return [fileBlob, fileName] as const;
}
