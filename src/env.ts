import { baseURL as defaultbaseURL } from './config';

export const baseURL = process.env.NEUPHONIC_BASE_URL || defaultbaseURL;
export const apiKey = process.env.NEUPHONIC_API_KEY!;
export const baseHttp = !!process.env.NEUPHONIC_BASE_HTTP;
