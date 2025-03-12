import fs from 'fs/promises';
import z from 'zod';

import { Transport } from './transport';

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

    const file = await fs.readFile(params.audioPath);
    const fileBlob = new Blob([file], { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('audio_file', fileBlob, 'audio.wav');

    if (params.isTranscriptFile && params.transcript) {
      const file = await fs.readFile(params.transcript);
      const fileBlob = new Blob([file], { type: 'text/plain' });

      formData.append('transcript', fileBlob, 'transcript.txt');
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
      return result.data.status === 'Finished';
    }

    throw new Error('Unknown audio restorations delete error');
  }
}
