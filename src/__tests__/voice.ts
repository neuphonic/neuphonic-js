import fs from 'fs';

import { createClient } from '../client';

describe('Voice', () => {
  test('List', async () => {
    const client = createClient();

    const voices = await client.voices.list();

    expect(voices.length).toBeGreaterThan(0);

    expect(voices[0]).toHaveProperty('id');
    expect(voices[0]).toHaveProperty('name');
  });

  test('Get', async () => {
    const client = createClient();

    const voices = await client.voices.list();

    const id = voices[0]!.id;
    const voice = await client.voices.get({ id });

    expect(voice.id).toBe(id);
  });

  test('Clone', async () => {
    const client = createClient();

    const id = await client.voices.clone({
      voiceName: 'Cloned Name',
      voiceFilePath: __dirname + '/data/voice1.wav',
      voiceTags: ['Tag 1']
    });

    expect(id).toBeDefined();

    const voice = await client.voices.get({ id });

    expect(voice.id).toBe(id);
    expect(voice.name).toBe('Cloned Name');
    expect(voice.tags).toEqual(['Tag 1']);
  }, 10000);

  test('Clone readable', async () => {
    const client = createClient();

    const voiceStream = fs.createReadStream(__dirname + '/data/voice1.wav');

    const id = await client.voices.clone({
      voiceName: 'Cloned Readbale Name',
      voiceFilePath: voiceStream,
      voiceFileName: 'voice1.wav',
      voiceTags: ['Tag 1']
    });

    expect(id).toBeDefined();

    const voice = await client.voices.get({ id });

    expect(voice.id).toBe(id);
    expect(voice.name).toBe('Cloned Readbale Name');
    expect(voice.tags).toEqual(['Tag 1']);
  }, 10000);

  test('Update', async () => {
    const client = createClient();

    const voiceUpdated1 = await client.voices.update({
      name: 'Cloned Name',
      newVoiceFilePath: __dirname + '/data/voice1.wav',
      newVoiceTags: ['Tag 2', 'Tag 3']
    });
    expect(voiceUpdated1).toBeTruthy();

    let voice = await client.voices.get({ name: 'Cloned Name' });
    expect(voice.tags).toEqual(['Tag 2', 'Tag 3']);

    const voiceStream = fs.createReadStream(__dirname + '/data/voice1.wav');

    const voiceUpdated2 = await client.voices.update({
      name: 'Cloned Name',
      newVoiceFilePath: voiceStream,
      newVoiceFileName: 'voice1.wav',
      newVoiceTags: ['Tag 4', 'Tag 5']
    });
    expect(voiceUpdated2).toBeTruthy();

    voice = await client.voices.get({ name: 'Cloned Name' });
    expect(voice.tags).toEqual(['Tag 4', 'Tag 5']);
  }, 20000);

  test('Delete', async () => {
    const client = createClient();

    const voiceDeleted1 = await client.voices.delete({
      name: 'Cloned Name'
    });
    expect(voiceDeleted1).toBeTruthy();

    const voiceDeleted2 = await client.voices.delete({
      name: 'Cloned Readbale Name'
    });
    expect(voiceDeleted2).toBeTruthy();
  });
});
