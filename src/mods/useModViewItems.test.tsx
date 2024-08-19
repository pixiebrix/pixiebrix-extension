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

import useModViewItems from "@/mods/useModViewItems";
import {
  type ActivatedModComponent,
  type HydratedModComponent,
} from "@/types/modComponentTypes";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { type UnavailableMod } from "@/types/modTypes";
import { renderHook } from "@/extensionConsole/testHelpers";
import {
  modComponentFactory,
  activatedModComponentFactory,
} from "@/testUtils/factories/modComponentFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";

import { pickModDefinitionMetadata } from "@/modDefinitions/util/pickModDefinitionMetadata";
import { mapModComponentToUnavailableMod } from "@/utils/modUtils";

const axiosMock = new MockAdapter(axios);

describe("useModViewItems", () => {
  beforeEach(() => {
    axiosMock.onGet("/api/marketplace/listings").reply(200, []);
  });

  it("creates entry for ModComponentBase", async () => {
    const modComponent = modComponentFactory() as HydratedModComponent;

    const { waitForEffect, result } = renderHook(
      () => useModViewItems([modComponent]),
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentSlice.actions.UNSAFE_setModComponents([
              modComponent as unknown as ActivatedModComponent,
            ]),
          );
        },
      },
    );

    await waitForEffect();

    expect(result.current).toEqual({
      isLoading: false,
      modViewItems: [expect.toBeObject()],
    });
  });

  it("creates entry for an undefined mod", async () => {
    const recipe = defaultModDefinitionFactory();
    const activatedModComponent = activatedModComponentFactory({
      _recipe: pickModDefinitionMetadata(recipe),
    });

    const { waitForEffect, result } = renderHook(
      () => useModViewItems([recipe]),
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentSlice.actions.UNSAFE_setModComponents([
              activatedModComponent,
            ]),
          );
        },
      },
    );

    await waitForEffect();

    expect(result.current).toEqual({
      isLoading: false,
      modViewItems: [expect.toBeObject()],
    });
  });

  it("creates for unavailable recipe", async () => {
    const modDefinition = defaultModDefinitionFactory();
    const activatedModComponent = activatedModComponentFactory({
      _recipe: pickModDefinitionMetadata(modDefinition),
    });

    const unavailableMod: UnavailableMod = mapModComponentToUnavailableMod(
      activatedModComponent,
    );

    const { waitForEffect, result } = renderHook(
      () => useModViewItems([unavailableMod]),
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentSlice.actions.UNSAFE_setModComponents([
              activatedModComponent,
            ]),
          );
        },
      },
    );

    await waitForEffect();

    expect(result.current).toEqual({
      isLoading: false,
      modViewItems: [expect.toBeObject()],
    });
  });
});
