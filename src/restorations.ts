// import fs from 'fs/promises';
import z from 'zod';
// import path from 'path';

import { Transport } from './transport';
import { transcriptFile, voiceFile } from './files';

const RestoreError = z.object({
  detail: z.union([z.string(), z.array(z.object({}))])
});

export const RestoreJobStatus = z.object({
  status: z.string(),
  file_url: z.string().optional(),
  message: z.string()
});
export type RestoreJobStatus = z.infer<typeof RestoreJobStatus>;

export const RestoreJob = z.object({
  job_id: z.string(),
  language: z.string(),
  created_at: z.string(),
  status: z.string(),
  file_name: z.string()
});
export type RestoreJob = z.infer<typeof RestoreJob>;

const AudioRestoreGetResponse = z.union([
  z.object({
    data: RestoreJobStatus
  }),
  RestoreError
]);

const AudioRestoreListResponse = z.union([
  z.object({
    data: z.object({ jobs: z.array(RestoreJob) })
  }),
  RestoreError
]);

const AudioRestoreResponse = z.union([
  z.object({
    data: z.object({ job_id: z.string() })
  }),
  RestoreError
]);

const AudioRestoreDeleteResponse = z.union([
  z.object({
    data: z.object({ status: z.string(), message: z.string() })
  }),
  RestoreError
]);

export class Restorations {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async restore(params: {
    audioPath: string;
    transcript?: string;
    langCode?: string;
    isTranscriptFile?: boolean;
  }): Promise<string> {
    const data: Record<string, string> = {
      lang_code: params.langCode || 'eng-us'
    };

    const [fileBlob, fileName] = await voiceFile(params.audioPath);

    const formData = new FormData();
    formData.append('audio_file', fileBlob, fileName);

    if (params.isTranscriptFile && params.transcript) {
      const [fileBlob, fileName] = await transcriptFile(params.transcript);
      formData.append('transcript', fileBlob, fileName);
    } else {
      data.transcript = params.transcript || '';
    }

    const response = await this.transport.upload('restore', data, formData);

    const { data: result } = AudioRestoreResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.job_id;
    }

    throw new Error('Unknown restore audio error');
  }

  async get(params: { jobId: string }): Promise<RestoreJobStatus> {
    const response = await this.transport.request({
      url: `restore/${params.jobId}`
    });

    const { data: result } = AudioRestoreGetResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data;
    }

    throw new Error('Unknown audio restorations get error');
  }

  async list(): Promise<RestoreJob[]> {
    const response = await this.transport.request({ url: 'restore' });

    const { data: result } = AudioRestoreListResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.jobs;
    }

    throw new Error('Unknown audio restorations list error');
  }

  async delete(params: { jobId: string }): Promise<boolean> {
    const response = await this.transport.request({
      url: `restore/${params.jobId}`,
      method: 'DELETE'
    });

    const { data: result } = AudioRestoreDeleteResponse.safeParse(response);

    if (result && 'data' in result) {
      return (
        result.data.status === 'Finished' ||
        result.data.status === 'Not Finished'
      );
    }

    throw new Error('Unknown audio restorations delete error');
  }
}
