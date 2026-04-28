const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  label?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, delayMs = 800, label = '' }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const statusMatch = (err as Error)?.message?.match(/V4 API (\d+)/);
      const status = statusMatch?.[1] ? parseInt(statusMatch[1], 10) : 0;
      const isRetryable = !status || RETRYABLE_STATUSES.includes(status);

      if (!isRetryable || attempt === maxAttempts) throw err;

      const wait = delayMs * Math.pow(2, attempt - 1);
      console.warn(`[Retry] ${label} attempt ${attempt} failed, retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }

  throw lastError;
}
