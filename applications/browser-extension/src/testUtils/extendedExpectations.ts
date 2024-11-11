/* eslint-disable @typescript-eslint/no-namespace -- Types must extend the global namespace */
/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file This file should not be imported directly, it's imported by Jest's config as it
 * extends the global object with custom matchers and sets the global types.
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBePending(): Promise<CustomMatcherResult>;

      /**
       * @warning This only asserts on the amount of time that passes from
       * this toFulfillWithinMilliseconds() call, not from the promise creation.
       *
       * If this is troublesome, copy the `trackSettledTime` function/pattern instead:
       * https://github.com/pixiebrix/webext-messenger/blob/22eeba8b5b2efe3ecb6beb7a8c493f260c9499fb/source/test/helpers.ts#L28-L38
       * https://github.com/pixiebrix/pixiebrix-extension/pull/8133#discussion_r1547932237
       *
       * @example
       *   // Wrong: DO NOT await anything between the promise creation and the expect() call
       *   const promise = getMilk();
       *   await act(); // This will mess up the timing
       *   await expect(promise).toFulfillWithinMilliseconds(1000);
       *
       *   // Correct: Await the expect() call directly
       *   const expectation = expect(getMilk()).toFulfillWithinMilliseconds(1000);
       *   await act();
       *   await expectation;
       */
      toFulfillWithinMilliseconds(
        maximumDuration: number,
      ): Promise<CustomMatcherResult>;
    }
  }
}

/** Helper to ensure we're tracking the specific promise’s duration without risking to track anything else */
async function trackSettleTime(promise: Promise<unknown>): Promise<number> {
  const startTime = performance.now();
  try {
    await promise;
  } catch {}

  return performance.now() - startTime;
}

expect.extend({
  // Extracted and adapted from https://github.com/pixiebrix/webext-messenger/blob/22eeba8b5b2efe3ecb6beb7a8c493f260c9499fb/source/test/helpers.ts#L40
  async toFulfillWithinMilliseconds(
    promise: Promise<unknown>,
    maximumDuration: number,
  ) {
    const duration = await trackSettleTime(promise);

    return {
      pass: duration < maximumDuration,
      message: () =>
        `Expected promise to be fulfilled within ${maximumDuration}ms, but it took ${duration}ms`,
    };
  },

  // Extracted and adapted from https://github.com/fregante/webext-events/blob/405464499bbe771727e55e34b67f24380685a67e/vitest.setup.js#L11
  async toBePending(promise) {
    const pending = Symbol("pending");
    const result = await Promise.race([promise, pending]);

    return {
      message: () => "Expected Promise to be pending, but it resolved.",
      pass: result === pending,
    };
  },
});
