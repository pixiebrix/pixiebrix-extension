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

import React, { useEffect } from "react";
import { useAllModDefinitions } from "./modDefinitionHooks";
import useSaveMod from "@/pageEditor/hooks/useSaveMod";
import { act, render } from "@/pageEditor/testHelpers";
import { validateSchema } from "@/extensionConsole/pages/packageEditor/validate";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { registry as messengerRegistry } from "@/background/messenger/api";
import * as localRegistry from "@/registry/packageRegistry";
import pDefer from "p-defer";
import { defaultInitialValue } from "@/utils/asyncStateUtils";
import { appApiMock } from "@/testUtils/appApiMock";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type AsyncState } from "@/types/sliceTypes";
import { API_PATHS } from "@/data/service/urlPaths";

jest.mock("@/contentScript/messenger/api");
jest.mock("@/components/ConfirmationModal", () => ({
  ...jest.requireActual("@/components/ConfirmationModal"),
  useModals: () => ({
    showConfirmation: jest.fn().mockResolvedValue(true),
  }),
}));

beforeAll(() => {
  appApiMock.reset();
});

// The test "loads" mod definitions from server and attempts to save the first (and the only) mod definition
// It verifies the proper API calls and the mod definition schema "sent" to the server
test("load mod definitions and save one", async () => {
  // This is the shape of a mod definition that we get from the API /api/recipes/ endpoint
  const sourceModDefinition = defaultModDefinitionFactory();

  const packageId = uuidv4();
  const modDefinitionId = validateRegistryId(sourceModDefinition.metadata.id);
  let resultModDefinition: any; // Holds the data that will be sent to the API

  appApiMock
    .onGet("/api/registry/bricks/")
    .reply(200, [sourceModDefinition])
    .onGet(API_PATHS.BRICKS)
    .reply(200, [
      {
        id: packageId,
        name: modDefinitionId,
      },
    ])
    .onPut(API_PATHS.BRICK(packageId))
    .reply(({ data }) => {
      resultModDefinition = JSON.parse(data as string);
      return [201, { data }];
    });

  // Pre-populate IDB with the mod definition
  await localRegistry.syncPackages();

  // Sanity check that localRegistry.syncPackages fetches from server
  expect(appApiMock.history.get!).toHaveLength(1);

  // Skip the messenger, and use the IDB registry directly
  jest
    .mocked(messengerRegistry.getByKinds)
    .mockImplementation(localRegistry.getByKinds);

  jest
    .mocked(messengerRegistry.syncRemote)
    .mockImplementation(localRegistry.syncPackages);

  const fetchingSavingPromise = pDefer<void>();

  const TestComponent: React.FunctionComponent = () => {
    // Internally useSaveMod calls useAllModDefinitions.
    // To make it more transparent and realistic we use useAllModDefinitions here
    // The hook will:
    // - load the mod definitions from server
    // - parse the raw mod definitions and save them to the registry (local storage)
    // - return all the mod definitions from the registry to the caller
    const { data: allModDefinitions, isFetching } = defaultInitialValue<
      ModDefinition[],
      AsyncState<ModDefinition[]>
    >(useAllModDefinitions(), []);

    const { save: saveRecipe, isSaving: isSavingRecipe } = useSaveMod();

    // Track if saveRecipe has been called
    const calledSave = React.useRef(false);
    // Track if re-fetching of the mod definitions by the registry has been called
    const calledRefetch = React.useRef(false);

    if (!isFetching && allModDefinitions!.length > 0 && !calledSave.current) {
      // The saveRecipe action involves
      // - preparing a recipe for saving
      // - calling RTK Query mutation
      // - saving the recipe to the server
      void saveRecipe(modDefinitionId);
      calledSave.current = true;
    }

    useEffect(() => {
      if (calledSave.current && calledRefetch.current && !isFetching) {
        fetchingSavingPromise.resolve();
      }

      if (isFetching && calledSave.current) {
        calledRefetch.current = true;
      }
    }, [isFetching]);

    return (
      <div>
        {isFetching ? "Fetching" : "Not Fetching"}
        {`Got ${allModDefinitions!.length} mod definitions`}
        {isSavingRecipe ? "Saving" : "Not Saving"}
        {calledSave.current ? "Called Save" : "Not Called Save"}
      </div>
    );
  };

  render(<TestComponent />, {
    setupRedux(dispatch) {
      dispatch(
        modComponentSlice.actions.activateMod({
          modDefinition: sourceModDefinition,
          screen: "pageEditor",
          isReactivate: false,
        }),
      );
    },
  });

  // Let the registry and the RTK Query to load and update a mod definition
  await act(async () => fetchingSavingPromise.promise);

  expect(appApiMock.history.get!.map((x) => x.url)).toEqual([
    "/api/registry/bricks/",
    API_PATHS.BRICKS,
    "/api/registry/bricks/",
    API_PATHS.BRICKS,
  ]);

  // Validate the config sent to server
  const validationResult = await validateSchema(
    resultModDefinition.config as string,
  );
  expect(validationResult).toEqual({});
});
