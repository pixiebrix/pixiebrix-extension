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

import {
  clear,
  getByKinds,
  syncPackages,
  find,
  count,
} from "@/registry/packageRegistry";
import { produce } from "immer";
import { appApiMock } from "@/testUtils/appApiMock";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import pDefer from "p-defer";
import { normalizeSemVerString } from "@/types/helpers";
import { API_PATHS } from "@/data/service/urlPaths";

describe("localRegistry", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  afterEach(async () => {
    await clear();
  });

  it("should sync packages for empty db", async () => {
    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICKS)
      .reply(200, [defaultModDefinitionFactory()]);
    await syncPackages();
    const recipes = await getByKinds(["recipe"]);
    expect(recipes).toHaveLength(1);
    expect(appApiMock.history.get[0]!.url).toBe(API_PATHS.REGISTRY_BRICKS);
  });

  it("should sync packages", async () => {
    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICKS)
      .replyOnce(200, [defaultModDefinitionFactory()]);

    await syncPackages();

    appApiMock.onGet(API_PATHS.REGISTRY_BRICKS).replyOnce(200, []);

    await syncPackages();

    const recipes = await getByKinds(["recipe"]);
    expect(recipes).toHaveLength(0);
  });

  it("should return latest version", async () => {
    const definition = defaultModDefinitionFactory();
    const updated = produce(definition, (draft) => {
      draft.metadata.version = normalizeSemVerString("9.9.9");
    });

    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICKS)
      .reply(200, [updated, definition]);

    await syncPackages();

    const result = await find(updated.metadata.id);

    expect(result!.version).toEqual({
      major: 9,
      minor: 9,
      patch: 9,
    });
  });

  it("should await sync on getByKinds", async () => {
    const deferred = pDefer<[number, unknown]>();

    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICKS)
      .reply(async () => deferred.promise);

    const recipesPromise = getByKinds(["recipe"]);

    await expect(count()).resolves.toBe(0);

    deferred.resolve([200, [defaultModDefinitionFactory()]]);

    // `recipesPromise` must come first since it waits on syncPackages. The `count` call doesn't wait.
    await expect(recipesPromise).resolves.toHaveLength(1);
    await expect(count()).resolves.toBe(1);
  });

  it("should await sync on lookup", async () => {
    const deferred = pDefer<[number, unknown]>();

    appApiMock
      .onGet(API_PATHS.REGISTRY_BRICKS)
      .reply(async () => deferred.promise);

    const packagePromise = find("foo/bar");

    await expect(count()).resolves.toBe(0);

    deferred.resolve([200, [defaultModDefinitionFactory()]]);

    // `packagePromise` must come first since it waits on syncPackages. The `count` call doesn't wait.
    await expect(packagePromise).resolves.toBeNull();
    await expect(count()).resolves.toBe(1);
  });
});
