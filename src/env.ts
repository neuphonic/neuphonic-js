import { baseURL as defaultbaseURL } from './config';

export const getEnvs = () => {
  return {
    baseURL: process.env.NEUPHONIC_BASE_URL || defaultbaseURL,
    apiKey: process.env.NEUPHONIC_API_KEY!,
    baseHttp: !!process.env.NEUPHONIC_BASE_HTTP
  };
};
