/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { cachePromiseMethod } from "@/utils/cachePromise";
import pDefer, { type DeferredPromise } from "p-defer";

describe("cachePromise", () => {
  it("should handle rejection", async () => {
    const deferred: Array<DeferredPromise<unknown>> = [];

    const factory = jest.fn().mockImplementation(async () => {
      const d = pDefer();
      deferred.push(d);
      return d.promise;
    });

    // The method is cached at module-level. So need to use different key per test
    const cachedMethod = cachePromiseMethod(["a"], factory);

    const cached1 = cachedMethod();
    const cached2 = cachedMethod();

    // The promises are cached
    expect(deferred).toHaveLength(1);

    deferred[0].reject(new Error("error"));

    await expect(cached1).rejects.toThrow("error");
    await expect(cached2).rejects.toThrow("error");
  });

  it("should not cache failed result", async () => {
    const deferred: Array<DeferredPromise<unknown>> = [];

    const factory = jest.fn().mockImplementation(async () => {
      const d = pDefer();
      deferred.push(d);
      return d.promise;
    });

    // The method is cached at module-level. So need to use different key per test
    const cachedMethod = cachePromiseMethod(["b"], factory);

    const cached1 = cachedMethod();

    expect(deferred).toHaveLength(1);
    deferred[0].reject(new Error("error"));
    await expect(cached1).rejects.toThrow("error");

    const cached2 = cachedMethod();
    expect(deferred).toHaveLength(2);

    deferred[1].reject(new Error("other error"));
    await expect(cached2).rejects.toThrow("other error");
  });

  it("should handle resolution", async () => {
    const deferred: Array<DeferredPromise<unknown>> = [];

    const factory = jest.fn().mockImplementation(async () => {
      const d = pDefer();
      deferred.push(d);
      return d.promise;
    });

    // The method is cached at module-level. So need to use different key per test
    const cachedMethod = cachePromiseMethod(["a"], factory);

    const cached1 = cachedMethod();
    const cached2 = cachedMethod();

    // The promises are cached
    expect(deferred).toHaveLength(1);

    deferred[0].resolve(42);

    await expect(cached1).resolves.toEqual(42);
    await expect(cached2).resolves.toEqual(42);
  });
});
