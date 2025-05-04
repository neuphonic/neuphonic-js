export interface TransportConfig {
  baseURL: string;
  baseHttp?: boolean;
  apiKey?: string;
  jwtToken?: string;
}

type FetchParams = Parameters<typeof fetch>;
type FetchResponse = ReturnType<typeof fetch>;

export class Transport {
  readonly headers: Record<string, string>;
  readonly config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.headers = {
      'Content-Type': 'application/json'
    };
    if (this.config.apiKey) {
      this.headers['x-api-key'] = this.config.apiKey;
    }
  }

  jwt(token: string) {
    this.config.jwtToken = token;
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
    const response = await this.fetch(this.url('https', url, query), {
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
    const headers = {
      ...this.headers
    };

    delete headers['Content-Type'];

    const response = await this.fetch(this.url('https', url, query), {
      method,
      headers,
      body: formData
    });

    try {
      return await response.json();
    } catch (err) {
      return undefined;
    }
  }

  url(
    protocol: string,
    path: string,
    query?: Record<string, string | number | undefined>
  ) {
    if (this.config.baseHttp) {
      if (protocol === 'https') {
        protocol = 'http';
      } else if (protocol == 'wss') {
        protocol = 'ws';
      }
    }

    return `${protocol}://${this.config.baseURL}/${path}${this.paramsToQs(query)}`;
  }

  urlJwt(
    protocol: string,
    path: string,
    query?: Record<string, string | number | undefined>
  ) {
    return this.url(protocol, path, {
      jwt_token: this.config.jwtToken,
      ...query
    });
  }
}
