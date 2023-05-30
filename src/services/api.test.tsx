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

import { type AxiosError } from "axios";
import { configureStore } from "@reduxjs/toolkit";
import {
  appApi,
  useGetMarketplaceListingsQuery,
  useGetPackageQuery,
  useUpdatePackageMutation,
} from "@/services/api";
import { renderHook } from "@testing-library/react-hooks";
import { Provider } from "react-redux";
import React from "react";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { uuidv4 } from "@/types/helpers";
import { act } from "react-dom/test-utils";
import { waitForEffect } from "@/testUtils/testHelpers";
import { isPlainObject } from "lodash";
import { appApiMock } from "@/testUtils/appApiMock";
import { type RegistryId } from "@/types/registryTypes";

function testStore() {
  return configureStore({
    reducer: {
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      // eslint-disable-next-line unicorn/prefer-spread -- use concat for proper type inference
      return getDefaultMiddleware().concat(appApi.middleware);
    },
    preloadedState: {},
  });
}

describe("appBaseQuery", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  test("RTK preserves AxiosError information", async () => {
    appApiMock.onPut().reply(400, { config: ["Field error."] });

    const store = testStore();

    const { result } = renderHook(() => useUpdatePackageMutation(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    const [update] = result.current;

    try {
      await act(async () => {
        await update({ id: uuidv4() } as any).unwrap();
      });

      expect.fail("Expected error");
    } catch (error) {
      expect(isAxiosError(error)).toBe(true);
      // `serializeError` doesn't serialize properties on the prototype
      expect((error as any).isAxiosError).toBeUndefined();
    }
  });

  test("RTK preserves response on 404", async () => {
    appApiMock.onGet().reply(404);

    const store = testStore();

    const id = uuidv4();

    const { result } = renderHook(() => useGetPackageQuery({ id }), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await waitForEffect();

    const { error, data } = result.current;
    expect(data).toBeUndefined();
    expect(isAxiosError(error)).toBe(true);

    // Is a plain serialized object, but use type for autocomplete
    const axiosError = error as AxiosError;

    // `serializeError` doesn't serialize properties on the prototype
    expect(isPlainObject(error)).toBe(true);
    expect(axiosError.isAxiosError).toBeUndefined();
    expect(axiosError.response).toBeDefined();
    expect(axiosError.response.status).toBe(404);
    // The type definition is incorrect: https://github.com/axios/axios/pull/5331
    expect(axiosError.status).toBeUndefined();
  });

  test("RTK forwards params to axios", async () => {
    appApiMock.onGet("/test", { params: { package__name: "bar" } }).reply(200);

    const store = testStore();

    renderHook(
      () =>
        useGetMarketplaceListingsQuery({ package__name: "bar" as RegistryId }),
      {
        wrapper: ({ children }) => (
          <Provider store={store}>{children}</Provider>
        ),
      }
    );

    await waitForEffect();

    expect(appApiMock.history.get[0].params).toStrictEqual({
      package__name: "bar",
    });
  });
});
