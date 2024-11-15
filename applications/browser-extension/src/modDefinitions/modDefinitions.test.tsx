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
import AsyncButton from "@/components/AsyncButton";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import SaveModVersionModal from "@/pageEditor/modListingPanel/modals/SaveModVersionModal";

beforeAll(() => {
  appApiMock.reset();
});

// The test "loads" mod definitions from server and attempts to save the first (and the only) mod definition
// It verifies the proper API calls and the mod definition schema "sent" to the server
test("load mod definitions and save one", async () => {
  // This is the shape of a mod definition that we get from the API endpoint
  const sourceModDefinition = defaultModDefinitionFactory();

  const packageId = uuidv4();
  const modDefinitionId = validateRegistryId(sourceModDefinition.metadata.id);
  let resultModDefinition: any; // Holds the data that will be sent to the API

  appApiMock
    .onGet(API_PATHS.REGISTRY_BRICKS)
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
  expect(appApiMock.history.get).toHaveLength(1);

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

    const saveMod = useSaveMod();

    // Track if saveMod has been called
    const calledSave = React.useRef(false);
    // Track if re-fetching of the mod definitions by the registry has been called
    const calledRefetch = React.useRef(false);

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
        <SaveModVersionModal />
        <AsyncButton
          onClick={async () => {
            // The saveMod action involves
            // - preparing a mod for saving
            // - calling RTK Query mutation
            // - saving the mod to the server
            calledSave.current = true;
            await saveMod(modDefinitionId);
          }}
        >
          Save Mod
        </AsyncButton>
        {isFetching ? "Fetching" : "Not Fetching"}
        {`Got ${allModDefinitions!.length} mod definitions`}
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

  expect(appApiMock.history.get.map((x) => x.url)).toEqual([
    // `useAllModDefinitions` in TestComponent
    API_PATHS.REGISTRY_BRICKS,
  ]);

  await userEvent.click(
    await screen.findByRole("button", { name: "Save Mod" }),
  );

  expect(appApiMock.history.get.map((x) => x.url)).toEqual([
    API_PATHS.REGISTRY_BRICKS,
    // `useSaveMod` re-fetches definitions/editable packages
    API_PATHS.BRICKS,
    API_PATHS.REGISTRY_BRICKS,
  ]);

  // Try to avoid "Mod definitions not loaded yet. Try again." race in the useSaveMod hook
  await waitFor(async () => {
    expect(screen.queryByText("Not Fetching")).not.toBeInTheDocument();
  });

  await userEvent.type(
    await screen.findByRole("textbox", { name: "Message" }),
    "Test Message",
  );

  await userEvent.click(await screen.findByRole("button", { name: "Save" }));

  // Let the registry and the RTK Query to load and update a mod definition
  await act(async () => fetchingSavingPromise.promise);

  expect(appApiMock.history.get.map((x) => x.url)).toEqual([
    API_PATHS.REGISTRY_BRICKS,
    API_PATHS.BRICKS,
    API_PATHS.REGISTRY_BRICKS,
    // Saving causes definitions/editable packages to be re-fetched
    API_PATHS.REGISTRY_BRICKS,
    API_PATHS.BRICKS,
  ]);

  await expect(
    validateSchema(resultModDefinition.config as string),
  ).resolves.toStrictEqual({});
});
