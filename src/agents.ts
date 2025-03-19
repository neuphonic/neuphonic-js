import z from 'zod';

import { Transport } from './transport';

export const Agent = z.object({
  name: z.string(),
  agent_id: z.string(),
  greeting: z.string().optional(),
  prompt: z.string().optional()
});

const AgentError = z.object({
  detail: z.union([z.string(), z.array(z.object({}))])
});

const AgentListResponse = z.union([
  z.object({
    data: z.object({ agents: z.array(Agent) })
  }),
  AgentError
]);

const AgentGetResponse = z.union([
  z.object({
    data: z.object({
      agent: Agent
    })
  }),
  AgentError
]);

const AgentCreateResponse = z.union([
  z.object({
    data: z.object({
      message: z.string(),
      agent_id: z.string()
    })
  }),
  AgentError
]);

const AgentDeleteResponse = z.union([
  z.object({
    data: z.object({
      message: z.string(),
      agent_id: z.string()
    })
  }),
  AgentError
]);

export class Agents {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  async list() {
    const response = await this.transport.request({ url: 'agents' });

    const { data: result } = AgentListResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.agents;
    }

    throw new Error('Unknown list agents error');
  }

  async get({ id }: { id: string }) {
    const response = await this.transport.request({ url: `agents/${id}` });

    const { data: result } = AgentGetResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.agent;
    }

    throw new Error('Unknown get agent error');
  }

  async create(params: {
    name: string;
    prompt?: string;
    greeting?: string;
  }): Promise<string> {
    const response = await this.transport.request({
      url: 'agents',
      method: 'POST',
      body: params
    });

    const { data: result } = AgentCreateResponse.safeParse(response);

    if (result && 'data' in result) {
      return result.data.agent_id;
    }

    throw new Error('Unknown create agent error');
  }

  async delete({ id }: { id: string }) {
    const response = await this.transport.request({
      url: `agents/${id}`,
      method: 'DELETE'
    });

    const { data: result } = AgentDeleteResponse.safeParse(response);

    if (result && 'data' in result) {
      return true;
    } else if (result && 'detail' in result) {
      if (
        typeof result['detail'] === 'string' &&
        result['detail'].match(/Agent.*not found/)
      ) {
        return false;
      }
    }

    throw new Error('Unknown delete agent error');
  }
}
