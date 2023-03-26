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
import { getApiClient } from "@/services/apiClient";
import { recipeDefinitionFactory } from "@/testUtils/factories";
import { produce } from "immer";
import { type SemVerString } from "@/core";

jest.mock("@/services/apiClient");
const getApiClientMock = getApiClient as jest.Mock;

describe("localRegistry", () => {
  afterEach(async () => {
    await clear();
  });

  it("should fetch new packages for empty db", async () => {
    getApiClientMock.mockResolvedValue({
      get: jest.fn().mockResolvedValue({ data: [recipeDefinitionFactory()] }),
    });
    await syncPackages();
    const recipes = await getByKinds(["recipe"]);
    expect(recipes).toHaveLength(1);
  });

  it("should sync packages for empty db", async () => {
    getApiClientMock.mockResolvedValue({
      get: jest.fn().mockResolvedValue({ data: [recipeDefinitionFactory()] }),
    });
    await syncPackages();
    const recipes = await getByKinds(["recipe"]);
    expect(recipes).toHaveLength(1);
    const client = await getApiClientMock();
    expect(client.get).toHaveBeenCalledWith("/api/registry/bricks/");
  });

  it("should sync packages", async () => {
    getApiClientMock.mockResolvedValue({
      get: jest.fn().mockResolvedValue({ data: [recipeDefinitionFactory()] }),
    });
    await syncPackages();

    getApiClientMock.mockResolvedValue({
      get: jest.fn().mockResolvedValue({ data: [] }),
    });
    await syncPackages();

    const recipes = await getByKinds(["recipe"]);
    expect(recipes).toHaveLength(0);
  });

  it("should return latest version", async () => {
    const definition = recipeDefinitionFactory();
    const updated = produce(definition, (draft) => {
      draft.metadata.version = "9.9.9" as SemVerString;
    });

    getApiClientMock.mockResolvedValue({
      get: jest.fn().mockResolvedValue({ data: [updated, definition] }),
    });

    await syncPackages();

    const result = await find(updated.metadata.id);

    expect(result.version).toEqual({
      major: 9,
      minor: 9,
      patch: 9,
    });
  });
});
