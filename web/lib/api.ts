import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request(path: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/${path.replace(/^\//, '')}`, { cache: 'no-store' });
  } catch {
    throw new ApiError(`Cannot reach the API at ${API_URL}. Is the backend running?`, 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.message ?? res.statusText;
    throw new ApiError(Array.isArray(msg) ? msg.join(', ') : String(msg), res.status);
  }
  return res;
}

/** GET a JSON endpoint of the NestJS API. */
export const api = async <T>(path: string): Promise<T> => (await request(path)).json();

/** GET a binary endpoint (the PNG export). */
export const apiBlob = async (path: string): Promise<Blob> => (await request(path)).blob();

export const fetcher = <T,>(path: string) => api<T>(path);
