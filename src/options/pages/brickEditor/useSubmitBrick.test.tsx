/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import useSubmitBrick from "@/options/pages/brickEditor/useSubmitBrick";
import { renderHook } from "@testing-library/react-hooks";
import { Provider } from "react-redux";
import { type AuthState } from "@/auth/authTypes";
import servicesSlice, { type ServicesState } from "@/store/servicesSlice";
import { type SettingsState } from "@/store/settingsTypes";
import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "@/auth/authSlice";
import settingsSlice from "@/store/settingsSlice";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
// FIXME: this is coming through as a module with default being a JSON object. (yaml-jest-transform is being applied)
import pipedriveYaml from "@contrib/services/pipedrive.yaml?loadAsText";
import { appApi } from "@/services/api";
import { brickToYaml } from "@/utils/objToYaml";
import { getLinkedApiClient } from "@/services/apiClient";
import { act } from "react-dom/test-utils";
import testMiddleware, {
  resetTestMiddleware,
  actionTypes,
} from "@/testUtils/testMiddleware";

const axiosMock = new MockAdapter(axios);

jest.mock("@/options/pages/blueprints/utils/useReinstall", () => ({
  __esModule: true,
  useReinstall: jest.fn(),
  default: jest.fn(),
}));

jest.mock("@/services/apiClient", () => ({
  getLinkedApiClient: jest.fn(),
}));

const getLinkedApiClientMock = getLinkedApiClient as jest.Mock;

getLinkedApiClientMock.mockResolvedValue(axios.create());

function testStore(initialState?: {
  auth: AuthState;
  services: ServicesState;
  settings: SettingsState;
}) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      services: servicesSlice.reducer,
      settings: settingsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return (
        getDefaultMiddleware()
          // eslint-disable-next-line unicorn/prefer-spread -- use concat for proper type inference
          .concat(appApi.middleware)
          // eslint-disable-next-line unicorn/prefer-spread -- use concat for proper type inference
          .concat(testMiddleware)
      );
    },
    preloadedState: initialState,
  });
}

describe("useSubmitBrick", () => {
  it("handles 400 error editing public listing", async () => {
    const store = testStore();

    resetTestMiddleware();

    const { result } = renderHook(() => useSubmitBrick({ create: false }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    const resetForm = jest.fn();
    const setErrors = jest.fn();

    const errorData = {
      config: [
        "Cannot overwrite version of a published brick. Increment the version",
      ],
    };

    axiosMock.onPut().reply(400, errorData);

    await act(async () => {
      // `pipedriveYaml` actually comes through as an object. Jest is ignoring loadAsText
      await result.current.submit(
        {
          config: brickToYaml(pipedriveYaml as any),
          reactivate: false,
          public: true,
          organizations: [],
        },
        {
          resetForm,
          setErrors,
        } as any
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
});
