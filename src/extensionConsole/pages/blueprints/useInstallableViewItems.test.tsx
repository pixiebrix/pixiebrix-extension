/* eslint-disable new-cap -- test methods */
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

import useInstallableViewItems from "@/extensionConsole/pages/blueprints/useInstallableViewItems";
import {
  extensionFactory,
  persistedExtensionFactory,
  recipeFactory,
} from "@/testUtils/factories";
import {
  type PersistedExtension,
  type ResolvedExtension,
  selectSourceRecipeMetadata,
} from "@/types/extensionTypes";
import extensionsSlice from "@/store/extensionsSlice";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { type UnavailableRecipe } from "@/extensionConsole/pages/blueprints/blueprintsTypes";
import { selectUnavailableRecipe } from "@/extensionConsole/pages/blueprints/useInstallables";
import { renderHook } from "@/extensionConsole/testHelpers";

const axiosMock = new MockAdapter(axios);

describe("useInstallableViewItems", () => {
  beforeEach(() => {
    axiosMock.onGet("/api/marketplace/listings").reply(200, []);
  });

  it("creates entry for IExtension", async () => {
    const extension = extensionFactory() as ResolvedExtension;

    const wrapper = renderHook(() => useInstallableViewItems([extension]), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setExtensions([
            extension as unknown as PersistedExtension,
          ])
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      isLoading: false,
      installableViewItems: [expect.toBeObject()],
    });
  });

  it("creates entry for recipe", async () => {
    const recipe = recipeFactory();
    const extension = persistedExtensionFactory({
      _recipe: selectSourceRecipeMetadata(recipe),
    });

    const wrapper = renderHook(() => useInstallableViewItems([recipe]), {
      setupRedux(dispatch) {
        dispatch(extensionsSlice.actions.UNSAFE_setExtensions([extension]));
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      isLoading: false,
      installableViewItems: [expect.toBeObject()],
    });
  });

  it("creates for unavailable recipe", async () => {
    const recipe = recipeFactory();
    const extension = persistedExtensionFactory({
      _recipe: selectSourceRecipeMetadata(recipe),
    });

    const unavailableRecipe: UnavailableRecipe =
      selectUnavailableRecipe(extension);

    const wrapper = renderHook(
      () => useInstallableViewItems([unavailableRecipe]),
      {
        setupRedux(dispatch) {
          dispatch(extensionsSlice.actions.UNSAFE_setExtensions([extension]));
        },
      }
    );

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      isLoading: false,
      installableViewItems: [expect.toBeObject()],
    });
  });
});
