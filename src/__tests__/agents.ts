import { createClient } from '../client';

describe('Agent', () => {
  test('Create', async () => {
    const client = createClient();

    const id = await client.agents.create({
      name: 'My Agent',
      prompt: 'Hey',
      greeting: 'Greet',
    });

    expect(id).toBeDefined();

    const agent = await client.agents.get({ id });

    expect(agent.agent_id).toBe(id);
    expect(agent.prompt).toBe('Hey');
    expect(agent.greeting).toBe('Greet');
  });

  test('List', async () => {
    const client = createClient();

    const agents = await client.agents.list();

    expect(agents.length).toBeGreaterThan(0);

    expect(agents[0]).toHaveProperty('agent_id');
    expect(agents[0]).toHaveProperty('name');
  });

  test('Get', async () => {
    const client = createClient();

    const agents = await client.agents.list();

    const id = agents[0]!.agent_id;
    const agent = await client.agents.get({ id });

    expect(agent.agent_id).toBe(id);
  });

  test('Delete', async () => {
    const client = createClient();

    const agents = await client.agents.list();
    const id = agents.find(agent => agent.name == 'My Agent')?.agent_id;
    expect(id).toBeDefined();

    const voiceDeleted = await client.agents.delete({
      id: id!
    });
    expect(voiceDeleted).toBeTruthy();
  });
});
