import { createClient } from '../client';

describe('Restorations', () => {
  it('Restore', async () => {
    const client = createClient();

    const jobId = await client.restorations.restore({
      audioPath: __dirname + '/data/voice1.wav',
      transcript: __dirname + '/data/transcript.txt',
      isTranscriptFile: true
    });

    expect(jobId).toBeTruthy();
  }, 10000);

  it('List', async () => {
    const client = createClient();

    const jobs = await client.restorations.list();

    expect(jobs.length).toBeGreaterThan(0);

    expect(jobs[0]).toHaveProperty('job_id');
    expect(jobs[0]).toHaveProperty('status');
    expect(jobs[0]).toHaveProperty('created_at');
  });

  it('Get', async () => {
    const client = createClient();

    const jobs = await client.restorations.list();
    const jobId = jobs[0]!.job_id;

    const job = await client.restorations.get({ jobId });

    expect(job).toHaveProperty('message');
    expect(job).toHaveProperty('status');
  });

  it('Delete', async () => {
    const client = createClient();

    const jobs = await client.restorations.list();
    expect(jobs.length).toBeGreaterThan(0);

    const jobId = jobs[0]!.job_id;

    const jobDeleted = await client.restorations.delete({
      jobId
    });
    expect(jobDeleted).toBeTruthy();
  });
});
