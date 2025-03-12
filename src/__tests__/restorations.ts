import { createClient } from '../client';

describe('Restorations', () => {
  it('Get', async () => {
    const client = createClient();

    console.log(
      await client.restorations.get({
        jobId: 'e571c0f0-83cc-427a-9b5f-32ac28a39624'
      })
    );
  });

  it('Delete', async () => {
    const client = createClient();

    console.log(
      await client.restorations.delete({
        jobId: 'd9587ce5-df96-4056-8c1c-76ed9b5e436f'
      })
    );
  });

  it('List', async () => {
    const client = createClient();

    console.log(await client.restorations.list());
  });

  it('Restore', async () => {
    const client = createClient();

    console.log(
      await client.restorations.restore({
        audioPath: __dirname + '/../../data.wav',
        transcript: __dirname + '/../../transcript.txt',
        isTranscriptFile: true
      })
    );
  }, 30000);
});
