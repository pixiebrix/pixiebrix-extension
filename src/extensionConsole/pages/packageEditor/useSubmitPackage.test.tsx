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

import React from "react";
import useSubmitPackage from "@/extensionConsole/pages/packageEditor/useSubmitPackage";
import { act } from "@testing-library/react";
import { Provider } from "react-redux";
import { type AuthState } from "@/auth/authTypes";
import integrationsSlice, {
  type IntegrationsState,
} from "@/integrations/store/integrationsSlice";
import { type SettingsState } from "@/store/settings/settingsTypes";
import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "@/auth/authSlice";
import settingsSlice from "@/store/settings/settingsSlice";

// FIXME: Use ?loadAsText when supported by Jest https://github.com/jestjs/jest/pull/6282
import pipedriveYaml from "@contrib/integrations/pipedrive.yaml";
import { appApi } from "@/data/service/api";
import { brickToYaml } from "@/utils/objToYaml";
import testMiddleware, {
  actionTypes,
  resetTestMiddleware,
} from "@/testUtils/testMiddleware";
import notify from "@/utils/notify";
import { appApiMock } from "@/testUtils/appApiMock";
import { uuidv4 } from "@/types/helpers";
import { ModalContext } from "@/components/ConfirmationModal";
import { renderHook } from "@/extensionConsole/testHelpers";

jest.mock("@/utils/notify");
jest.mock("@/extensionConsole/pages/mods/utils/useReactivateMod");

const errorMock = jest.mocked(notify.error);

function testStore(initialState?: {
  auth: AuthState;
  services: IntegrationsState;
  settings: SettingsState;
}) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      services: integrationsSlice.reducer,
      settings: settingsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware()
        .concat(appApi.middleware)
        .concat(testMiddleware);
    },
    preloadedState: initialState,
  });
}

describe("useSubmitPackage", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  it("handles 400 error editing public listing", async () => {
    const store = testStore();

    resetTestMiddleware();

    const { result } = renderHook(() => useSubmitPackage({ create: false }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    const resetForm = jest.fn();
    const setErrors = jest.fn();

    const errorData = {
      config: [
        "Cannot overwrite version of a published brick. Increment the version",
      ],
    };

    appApiMock.onPut().reply(400, errorData);

    await act(async () => {
      // `pipedriveYaml` actually comes through as an object. Jest is ignoring loadAsText
      await result.current.submit(
        {
          config: brickToYaml(pipedriveYaml as any),
          reactivate: false,
          public: true,
          organizations: [],
          id: uuidv4(),
        },

        {
          resetForm,
          setErrors,
        } as any,
      );
    });

    expect(setErrors).toHaveBeenCalledWith(errorData);
    expect(resetForm).not.toHaveBeenCalled();

    // XXX: check that cache is not invalidated. This isn't quite right -- it appears no action is dispatched if
    // no components are subscribed to the tag.
    expect(actionTypes()).toEqual([
      "appApi/config/middlewareRegistered",
      "appApi/executeMutation/pending",
      "appApi/executeMutation/rejected",
    ]);
  });

  it("handles non-config 400 field error", async () => {
    const errorMessage = "Invalid organization pk";
    const store = testStore();

    resetTestMiddleware();

    const { result } = renderHook(() => useSubmitPackage({ create: false }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    const resetForm = jest.fn();
    const setErrors = jest.fn();

    const errorData = {
      // Handle other 400 field errors, e.g., https://github.com/pixiebrix/pixiebrix-extension/issues/4697
      organizations: [errorMessage],
    };

    appApiMock.onPut().reply(400, errorData);

    await act(async () => {
      // `pipedriveYaml` actually comes through as an object. Jest is ignoring loadAsText
      await result.current.submit(
        {
          config: brickToYaml(pipedriveYaml as any),
          reactivate: false,
          public: true,
          organizations: [],
          id: uuidv4(),
        },

        {
          resetForm,
          setErrors,
        } as any,
      );
    });

    expect(setErrors).not.toHaveBeenCalledWith(errorData);
    expect(resetForm).not.toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalledWith({
      message: "Invalid organizations",
      error: expect.toBeObject(),
    });
  });

  it("shows delete confirmation modal", async () => {
    const store = testStore();

    resetTestMiddleware();

    const showConfirmation = jest.fn().mockResolvedValue(false);

    const { result } = renderHook(() => useSubmitPackage({ create: false }), {
      wrapper: ({ children }) => (
        <ModalContext.Provider value={{ showConfirmation }}>
          <Provider store={store}>{children}</Provider>
        </ModalContext.Provider>
      ),
    });

    const id = uuidv4();

    await act(async () => {
      await result.current.remove!({ id, name: "Test" });
    });

    expect(showConfirmation).toHaveBeenCalledOnce();
  });
});
