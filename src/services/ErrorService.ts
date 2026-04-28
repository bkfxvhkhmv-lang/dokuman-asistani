interface NoopTransaction {
  finish(): void;
  setStatus(status: string): void;
  setTag(key: string, value: string): void;
  setData(key: string, value: unknown): void;
}

type LogLevel = 'error' | 'warning' | 'info' | 'debug';

const createNoopTransaction = (): NoopTransaction => ({
  finish() {},
  setStatus() {},
  setTag() {},
  setData() {},
});

class ErrorService {
  static init(): void {
    if (__DEV__) {
      console.log('[ErrorService] Sentry package not installed, running in local fallback mode.');
    }
  }

  static captureException(error: unknown, context: Record<string, unknown> = {}): void {
    if (__DEV__) {
      console.error('Caught Error:', error, context);
    }
  }

  static captureMessage(message: string, level: LogLevel = 'error', context: Record<string, unknown> = {}): void {
    if (__DEV__) {
      const logger = level === 'error' ? console.error : console.log;
      logger(`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  static setUser(user: { id?: string | null } | null): void {
    if (__DEV__) {
      console.log('[ErrorService] setUser', user?.id || null);
    }
  }

  static clearUser(): void {
    if (__DEV__) {
      console.log('[ErrorService] clearUser');
    }
  }

  static startTransaction(name: string, context: Record<string, unknown> = {}): NoopTransaction {
    if (__DEV__) {
      console.log('[ErrorService] startTransaction', name, context);
    }
    return createNoopTransaction();
  }
}

export default ErrorService;
