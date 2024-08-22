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

import { renderHook } from "@/pageEditor/testHelpers";
import useMigrateStandaloneComponentsToMods from "@/pageEditor/hooks/useMigrateStandaloneComponentsToMods";
import { actions } from "@/store/modComponents/modComponentSlice";
import {
  activatedModComponentFactory,
  modComponentFactory,
} from "@/testUtils/factories/modComponentFactories";

describe("useMigrateStandaloneComponentsToMods", () => {
  test("given empty form states and components, does nothing", () => {
    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
        },
      },
    );

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("given only activated components, does nothing", () => {
    const { getReduxStore } = renderHook(
      () => {
        useMigrateStandaloneComponentsToMods();
      },
      {
        setupRedux(dispatch, { store }) {
          jest.spyOn(store, "dispatch");
          dispatch(
            actions.UNSAFE_setModComponents([activatedModComponentFactory()]),
          );
        },
      },
    );

    const { dispatch } = getReduxStore();

    expect(dispatch).not.toHaveBeenCalled();
  });

  test("given unsaved form state, does not migrate", () => {});

  test("given activated component with no mod metadata, removes the form state", () => {});

  test("given activated component with mod metadata, syncs the form state", () => {});

  test("given myriad form states, migrates standalone form states correctly", () => {});
});
