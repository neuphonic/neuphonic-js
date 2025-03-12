export interface TransportConfig {
  baseURL: string;
  apiKey: string;
}

type FetchParams = Parameters<typeof fetch>;
type FetchResponse = ReturnType<typeof fetch>;

export class Transport {
  private headers: Record<string, string>;
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey
    };
  }

  async fetch(...params: FetchParams): FetchResponse {
    return fetch(...params);
  }

  paramsToQs(params?: Record<string, string | number | undefined>) {
    if (!params) {
      return '';
    }

    const qs = Object.entries(params)
      .filter(([_, val]) => val !== undefined)
      .map(([key, val]) => `${key}=${encodeURIComponent(val!)}`)
      .join('&');

    return qs.length ? `?${qs}` : '';
  }

  async request({
    url,
    method = 'GET',
    query,
    body
  }: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    query?: Record<string, string | number>;
    body?: Record<string, unknown>;
  }): Promise<any> {
    const finalUrl = `https://${this.config.baseURL}/${url}${this.paramsToQs(query)}`;

    const response = await this.fetch(finalUrl, {
      method,
      headers: this.headers,
      ...(body
        ? {
            body: JSON.stringify(body)
          }
        : {})
    });

    try {
      return await response.json();
    } catch (err) {
      return undefined;
    }
  }

  async upload(
    url: string,
    query: Record<string, string | number | undefined>,
    formData: FormData,
    method = 'POST'
  ): Promise<any> {
    const response = await this.fetch(
      `https://${this.config.baseURL}/${url}${this.paramsToQs(query)}`,
      {
        method,
        headers: {
          'x-api-key': this.config.apiKey
        },
        body: formData
      }
    );

    try {
      return await response.json();
    } catch (err) {
      return undefined;
    }
  }
}
