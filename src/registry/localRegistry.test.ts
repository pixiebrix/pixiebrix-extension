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

import {
  clear,
  getByKinds,
  syncPackages,
  find,
} from "@/registry/localRegistry";
import { recipeDefinitionFactory } from "@/testUtils/factories";
import { produce } from "immer";
import { type SemVerString } from "@/types/registryTypes";
import { appApiMock } from "@/testUtils/appApiMock";

describe("localRegistry", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  afterEach(async () => {
    await clear();
  });

  it("should sync packages for empty db", async () => {
    appApiMock
      .onGet("/api/registry/bricks/")
      .reply(200, [recipeDefinitionFactory()]);
    await syncPackages();
    const recipes = await getByKinds(["recipe"]);
    expect(recipes).toHaveLength(1);
    expect(appApiMock.history.get[0].url).toEqual("/api/registry/bricks/");
  });

  it("should sync packages", async () => {
    appApiMock
      .onGet("/api/registry/bricks/")
      .replyOnce(200, [recipeDefinitionFactory()]);

    await syncPackages();

    appApiMock.onGet("/api/registry/bricks/").replyOnce(200, []);

    await syncPackages();

    const recipes = await getByKinds(["recipe"]);
    expect(recipes).toHaveLength(0);
  });

  it("should return latest version", async () => {
    const definition = recipeDefinitionFactory();
    const updated = produce(definition, (draft) => {
      draft.metadata.version = "9.9.9" as SemVerString;
    });

    appApiMock.onGet("/api/registry/bricks/").reply(200, [updated, definition]);

    await syncPackages();

    const result = await find(updated.metadata.id);

    expect(result.version).toEqual({
      major: 9,
      minor: 9,
      patch: 9,
    });
  });
});
