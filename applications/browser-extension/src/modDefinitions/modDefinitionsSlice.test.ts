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

import { serializeError } from "serialize-error";
import { initialState, modDefinitionsActions } from "./modDefinitionsSlice";
import { type ModDefinitionsRootState } from "./modDefinitionsTypes";
import modDefinitionsRegistry from "./registry";
import { syncRemotePackages } from "../registry/memoryRegistry";
import { defaultModDefinitionFactory } from "../testUtils/factories/modDefinitionFactories";

jest.mock("./registry");

jest.mock("../registry/memoryRegistry", () => ({
  __esModule: true,
  ...jest.requireActual("@/registry/memoryRegistry"),
  syncRemotePackages: jest.fn(),
}));

afterEach(() => {
  jest.resetAllMocks();
});

const syncRemotePackagesMock = jest.mocked(syncRemotePackages);

describe("loadModDefinitionsFromCache", () => {
  test("calls registry and dispatches setModDefinitionsFromCache action", async () => {
    const dispatch = jest.fn();
    const cachedModDefinitions = [defaultModDefinitionFactory()];
    jest
      .mocked(modDefinitionsRegistry.all)
      .mockResolvedValueOnce(cachedModDefinitions as any);

    const thunkFunction = modDefinitionsActions.loadModDefinitionsFromCache();
    await thunkFunction(
      dispatch,
      () => ({ modDefinitions: initialState }),
      undefined,
    );
    expect(modDefinitionsRegistry.all).toHaveBeenCalledTimes(1);

    // These mock calls have a weird nested array structure
    const dispatchCallHistory = dispatch.mock.calls.map((call) => call[0]);
    expect(dispatchCallHistory).toStrictEqual([
      expect.objectContaining({
        type: modDefinitionsActions.loadModDefinitionsFromCache.pending.type,
      }),
      expect.objectContaining({
        type: modDefinitionsActions.loadModDefinitionsFromCache.fulfilled.type,
        payload: cachedModDefinitions,
      }),
    ]);
  });
});

describe("syncRemoteModDefinitions", () => {
  test("fetches mod definitions and updates the state", async () => {
    const dispatch = jest.fn();

    const cachedModDefinitions = [defaultModDefinitionFactory()];
    jest
      .mocked(modDefinitionsRegistry.all)
      .mockResolvedValueOnce(cachedModDefinitions as any);

    const thunkFunction = modDefinitionsActions.syncRemoteModDefinitions();
    await thunkFunction(
      dispatch,
      () => ({ modDefinitions: {} }) as ModDefinitionsRootState,
      undefined,
    );

    expect(syncRemotePackagesMock).toHaveBeenCalledTimes(1);
    expect(modDefinitionsRegistry.all).toHaveBeenCalledTimes(1);

    const dispatchCallHistory = dispatch.mock.calls.map((call) => call[0]);
    expect(dispatchCallHistory).toStrictEqual([
      expect.objectContaining({
        type: modDefinitionsActions.syncRemoteModDefinitions.pending.type,
      }),
      expect.objectContaining({
        type: modDefinitionsActions.syncRemoteModDefinitions.fulfilled.type,
        payload: cachedModDefinitions,
      }),
    ]);
  });

  test("sets error state", async () => {
    const dispatch = jest.fn();

    const error = new Error("test");
    syncRemotePackagesMock.mockRejectedValueOnce(error);

    const thunkFunction = modDefinitionsActions.syncRemoteModDefinitions();
    await thunkFunction(
      dispatch,
      () => ({ modDefinitions: {} }) as ModDefinitionsRootState,
      undefined,
    );

    const serializedError = serializeError(error, { useToJSON: false });

    const dispatchCallHistory = dispatch.mock.calls.map((call) => call[0]);
    expect(dispatchCallHistory).toStrictEqual([
      expect.objectContaining({
        type: modDefinitionsActions.syncRemoteModDefinitions.pending.type,
      }),
      expect.objectContaining({
        type: modDefinitionsActions.syncRemoteModDefinitions.rejected.type,
        error: serializedError,
      }),
    ]);
  });
});
