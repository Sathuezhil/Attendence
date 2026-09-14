import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginThrottleService } from './login-throttle.service';

describe('LoginThrottleService', () => {
  it('blocks the sixth failed attempt within the window', () => {
    const throttle = new LoginThrottleService();
    const email = 'boss@example.com';

    for (let i = 0; i < 5; i += 1) {
      throttle.assertAllowed(email);
      throttle.recordFailure(email);
    }

    expect(() => throttle.assertAllowed(email)).toThrow(HttpException);
    try {
      throttle.assertAllowed(email);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('clears failures after a successful login', () => {
    const throttle = new LoginThrottleService();
    const email = 'boss@example.com';
    throttle.recordFailure(email);
    throttle.clear(email);
    expect(() => throttle.assertAllowed(email)).not.toThrow();
  });
});
