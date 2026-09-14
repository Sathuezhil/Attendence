import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class LoginThrottleService {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  assertAllowed(email: string): void {
    const key = email.trim().toLowerCase();
    const row = this.attempts.get(key);
    if (!row) {
      return;
    }
    if (row.resetAt <= Date.now()) {
      this.attempts.delete(key);
      return;
    }
    if (row.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many login attempts. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(email: string): void {
    const key = email.trim().toLowerCase();
    const now = Date.now();
    const row = this.attempts.get(key);
    if (!row || row.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    row.count += 1;
  }

  clear(email: string): void {
    this.attempts.delete(email.trim().toLowerCase());
  }
}
