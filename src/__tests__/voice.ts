import { createClient } from '../client';

describe('Voice', () => {
  test('List', async () => {
    const client = createClient();

    console.log(await client.voices.list());
  });

  test('Get', async () => {
    const client = createClient();

    console.log(
      await client.voices.get({ id: 'f2185de7-e09b-46d7-9b20-8c82ef90524f' })
    );
  });

  test('Clone', async () => {
    const client = createClient();

    console.log(
      await client.voices.clone({
        voiceName: 'Wyatt_3',
        voiceFilePath: __dirname + '/../../data.wav',
        voiceTags: []
      })
    );
  });

  test('Delete', async () => {
    const client = createClient();

    console.log(
      await client.voices.delete({
        id: '8d5cc493-0a2f-44b3-ad39-c1e505766174'
      })
    );
  });

  test('Update', async () => {
    const client = createClient();

    console.log(
      await client.voices.update({
        id: '0a209008-8a00-4034-abcf-fb867919eaa6',
        // newVoiceName: 'Wyatt_10',
        // newVoiceFilePath: __dirname + '/../../data.wav',
        newVoiceTags: ['x', 'y']
      })
    );
  });
});
