import z from 'zod';
import fs from 'fs/promises';

import { Transport } from './transport';

export const Voice = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()).optional(),
  model_availability: z.array(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  type: z.string(),
  lang_code: z.string(),
  voice_id: z.string()
});
export type Voice = z.infer<typeof Voice>;

const VoiceError = z.object({
  detail: z.union([z.string(), z.array(z.object({}))])
});

const VoiceListResponse = z.union([
  z.object({
    data: z.object({ voices: z.array(Voice) })
  }),
  VoiceError
]);

const VoiceGetResponse = z.union([
  z.object({
    data: z.object({ voice: Voice })
  }),
  VoiceError
]);

const VoiceCloneResponse = z.union([
  z.object({
    data: z.object({ message: z.string(), voice_id: z.string() })
  }),
  VoiceError
]);

const VoiceDeleteResponse = z.union([
  z.object({
    data: z.object({ message: z.string() })
  }),
  VoiceError
]);

const VoiceUpdateResponse = z.union([
  z.object({
    data: z.object({ message: z.string() })
  }),
  VoiceError
]);

export type IdOrName =
  | { id: string; name?: undefined }
  | { id?: undefined; name: string };

export class Voices {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  private async nameOrId(nameOrId: IdOrName): Promise<string | undefined> {
    let id;

    if (nameOrId.id) {
      id = nameOrId.id;
    } else if (nameOrId.name) {
      id = await this.getId(nameOrId.name);
    }

    return id;
  }

  async getId(name: string): Promise<string | undefined> {
    const voices = await this.list();

    return voices.find((voice) => {
      return voice.name === name;
    })?.id;
  }

  async list(): Promise<Voice[]> {
    const response = await this.transport.request({ url: 'voices' });

    const { data: result } = VoiceListResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.voices;
    }

    throw new Error('Unknown list voice error');
  }

  async get(params: IdOrName): Promise<Voice> {
    const id = await this.nameOrId(params);

    if (!id && params.name) {
      throw new Error('Can not find a voice by name');
    }

    const response = await this.transport.request({ url: `voices/${id}` });

    const { data: result } = VoiceGetResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.voice;
    }

    throw new Error('Unknown get voice error');
  }

  async clone({
    voiceName,
    voiceFilePath,
    voiceTags
  }: {
    voiceName: string;
    voiceFilePath: string;
    voiceTags?: string[];
  }): Promise<string> {
    const file = await fs.readFile(voiceFilePath);
    const fileBlob = new Blob([file], { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('voice_file', fileBlob, 'audio.wav');

    const response = await this.transport.upload(
      'voices',
      {
        voice_name: voiceName,
        voice_tags: voiceTags ? voiceTags.join(', ') : undefined
      },
      formData
    );

    const { data: result } = VoiceCloneResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.voice_id;
    } else if (result && 'detail' in result) {
      if (
        typeof result['detail'] === 'string' &&
        result['detail'].match(/This voice name already exists/)
      ) {
        throw new Error(result.detail);
      }
    }

    throw new Error('Unknown clone voice error');
  }

  async delete(params: IdOrName): Promise<boolean> {
    const id = await this.nameOrId(params);

    if (!id && params.name) {
      throw new Error('Can not find a voice by name');
    }

    const response = await this.transport.request({
      url: `voices/${id}`,
      method: 'DELETE'
    });

    const { data: result } = VoiceDeleteResponse.safeParse(response);

    if (result && 'data' in result) {
      return true;
    } else if (result && 'detail' in result) {
      if (
        typeof result['detail'] === 'string' &&
        result['detail'].match(/This voice_id does not exist/)
      ) {
        return false;
      }
    }

    throw new Error('Unknown delete voice error');
  }

  async update(
    params: IdOrName & {
      newVoiceFilePath?: string;
      newVoiceName?: string;
      newVoiceTags?: string[];
    }
  ): Promise<boolean> {
    const id = await this.nameOrId(params);

    if (!id && params.name) {
      throw new Error('Can not find a voice by name');
    }

    if (
      (!params.newVoiceFilePath && !params.newVoiceTags) ||
      (params.newVoiceTags && !params.newVoiceTags.length)
    ) {
      throw new Error('Nothing to update');
    }

    const formData = new FormData();
    if (params.newVoiceFilePath && params.newVoiceFilePath) {
      const file = await fs.readFile(params.newVoiceFilePath);
      const fileBlob = new Blob([file], { type: 'audio/wav' });
      formData.append('new_voice_file', fileBlob, 'audio.wav');
    }

    const response = await this.transport.upload(
      `voices/${id}`,
      {
        new_voice_name: params.newVoiceName,
        new_voice_tags: params.newVoiceTags
          ? params.newVoiceTags.join(', ')
          : undefined
      },
      formData,
      'PATCH'
    );

    const { data: result } = VoiceUpdateResponse.safeParse(response);

    if (result && 'data' in result) {
      return !!result.data.message.match(/Voice has successfully been updated/);
    } else if (result && 'detail' in result) {
      if (
        typeof result['detail'] === 'string' &&
        result['detail'].match(/Provided `voice_id` is invalid/)
      ) {
        throw new Error('Voice does not exist');
      }
      if (
        typeof result['detail'] === 'string' &&
        result['detail'].match(/Audio file must be longer than 6 seconds/)
      ) {
        throw new Error(result['detail']);
      }
    }

    throw new Error('Unknown update voice error');
  }
}
