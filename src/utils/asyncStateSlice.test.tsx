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

import React, { type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { waitForEffect } from "@/testUtils/testHelpers";
import { Provider, useSelector } from "react-redux";
import { configureStore, type Store } from "@reduxjs/toolkit";
import {
  asyncStateSlice,
  getSelectAsyncFunctionResult,
  useAsyncReduxState,
} from "@/utils/asyncStateSlice";

const ASYNC_MOCK = "ASYNC_MOCK";
const asyncMock = jest.fn().mockResolvedValue(42);

const ValueComponentNoArgs: React.FunctionComponent = () => {
  const {
    data: dataFromHook,
    isLoading,
    error,
  } = useAsyncReduxState(ASYNC_MOCK, asyncMock, {
    cachePolicy: "cache-first",
  });

  const { data: dataFromSelector } = useSelector(
    getSelectAsyncFunctionResult(ASYNC_MOCK)
  );

  return isLoading ? (
    <div>Loading!</div>
  ) : error ? (
    <div>Error!</div>
  ) : (
    <div>
      <div data-testid="dataFromHook">{dataFromHook}</div>
      <div data-testid="dataFromSelector">{dataFromSelector}</div>
    </div>
  );
};

const ValueComponentWithArgs = (props: {
  "data-testid"?: string;
  asyncFunction?: (...args: string[]) => Promise<any>;
  asyncFunctionId?: string;
  inputArgs?: string[];
  children?: ReactNode;
}) => {
  const inputArgs = props.inputArgs || [
    "What is the answer to life, the universe and everything?",
  ];
  const {
    data: dataFromHook,
    isLoading,
    error,
  } = useAsyncReduxState(
    props.asyncFunctionId || ASYNC_MOCK,
    props.asyncFunction || asyncMock,
    {
      cachePolicy: "cache-first",
      inputArgs,
    }
  );

  const { data: dataFromSelector } = useSelector(
    getSelectAsyncFunctionResult(props.asyncFunctionId || ASYNC_MOCK, inputArgs)
  );
  return isLoading ? (
    <div>Loading!</div>
  ) : error ? (
    <div>Error!</div>
  ) : (
    <div>
      <div data-testid={`${props["data-testid"] || ""}dataFromHook`}>
        {dataFromHook}
      </div>
      <div data-testid={`${props["data-testid"] || ""}dataFromSelector`}>
        {dataFromSelector}
      </div>
    </div>
  );
};

/**
 * Create a Redux store for use in the tests.
 */
function createTestStore() {
  return configureStore({
    reducer: {
      asyncStateSlice: asyncStateSlice.reducer,
    },
  });
}

const renderHelper = (ui: React.ReactElement, store: Store) =>
  render(ui, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

describe("asyncStateSlice and useAsyncReduxState", () => {
  let store: Store;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore();
  });

  describe("Basic Functionality", () => {
    it("fetches async state result with loading state", async () => {
      renderHelper(<ValueComponentNoArgs />, store);
      expect(screen.getByText("Loading!")).toBeTruthy();
      await waitForEffect();
      expect(asyncMock).toHaveBeenCalledOnce();
      expect(screen.queryByText("Loading!")).toBeFalsy();
      expect(screen.getByTestId("dataFromHook")).toHaveTextContent("42");
      expect(screen.getByTestId("dataFromSelector")).toHaveTextContent("42");
    });

    it("displays error when async function is rejected", async () => {
      const errorMock = jest.fn().mockRejectedValue("Oops!");
      renderHelper(<ValueComponentWithArgs asyncFunction={errorMock} />, store);
      expect(screen.getByText("Loading!")).toBeTruthy();
      await waitForEffect();
      expect(errorMock).toHaveBeenCalledOnce();
      expect(screen.queryByText("Loading!")).toBeFalsy();
      expect(screen.getByText("Error!")).toBeTruthy();
    });

    it("synchronizes on redux state change", async () => {
      renderHelper(<ValueComponentNoArgs />, store);
      await waitForEffect();
      expect(asyncMock).toHaveBeenCalledOnce();
      expect(screen.getByTestId("dataFromHook")).toHaveTextContent("42");
      expect(screen.getByTestId("dataFromSelector")).toHaveTextContent("42");
      store.dispatch(
        asyncStateSlice.actions.updateAsyncState({
          functionId: ASYNC_MOCK,
          args: [],
          state: {
            data: 99,
            currentData: 99,
            isUninitialized: false,
            isFetching: false,
            isLoading: false,
            isSuccess: true,
            isError: false,
            error: undefined,
            _currentHookId: undefined,
          },
        })
      );
      await waitForEffect();
      expect(screen.getByTestId("dataFromHook")).toHaveTextContent("99");
      expect(screen.getByTestId("dataFromSelector")).toHaveTextContent("99");
    });
  });

  describe("No Argument Async Functions", () => {
    it("computes only once when multiple components using the same hook are mounted at the same time", async () => {
      renderHelper(
        <>
          <ValueComponentNoArgs />
          <ValueComponentNoArgs />
        </>,
        store
      );
      await waitForEffect();

      expect(asyncMock).toHaveBeenCalledOnce();
    });

    it("computes only once when the same component is rerendered", async () => {
      const { rerender } = renderHelper(<ValueComponentNoArgs />, store);
      await waitForEffect();
      rerender(<ValueComponentNoArgs />);
      await waitForEffect();

      expect(asyncMock).toHaveBeenCalledOnce();
    });
  });

  describe("Argument-Based Async Functions", () => {
    it("computes only once when multiple components using the same hook are mounted at the same time", async () => {
      renderHelper(
        <>
          <ValueComponentWithArgs />
          <ValueComponentWithArgs />
        </>,
        store
      );
      await waitForEffect();

      expect(asyncMock).toHaveBeenCalledOnce();
    });

    it("computes only once when the same component is rerendered", async () => {
      const { rerender } = renderHelper(<ValueComponentWithArgs />, store);
      await waitForEffect();
      rerender(<ValueComponentWithArgs />);
      await waitForEffect();

      expect(asyncMock).toHaveBeenCalledOnce();
    });
  });

  describe("Multiple Async Functions with Different Arguments", () => {
    it("computes once for each async function + arg combo", async () => {
      const anotherAsyncMock = jest
        .fn()
        .mockResolvedValue(-1)
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(3);

      const yetAnotherAsyncMock = jest
        .fn()
        .mockResolvedValue(-1)
        .mockResolvedValueOnce(5);

      renderHelper(
        <>
          <ValueComponentWithArgs
            data-testid={"1"}
            inputArgs={["life, the universe, etc?"]}
            asyncFunction={anotherAsyncMock}
          />
          <ValueComponentWithArgs
            data-testid={"2"}
            inputArgs={["How many pieces of toast?"]}
            asyncFunction={anotherAsyncMock}
          />
          <ValueComponentWithArgs
            data-testid={"3"}
            inputArgs={["What time is it?", "in EST please."]}
            asyncFunctionId={"ANOTHER_MOCK"}
            asyncFunction={yetAnotherAsyncMock}
          />
        </>,
        store
      );
      await waitForEffect();

      expect(screen.getByTestId("1dataFromHook")).toHaveTextContent("42");
      expect(screen.getByTestId("1dataFromSelector")).toHaveTextContent("42");

      expect(screen.getByTestId("2dataFromHook")).toHaveTextContent("3");
      expect(screen.getByTestId("2dataFromSelector")).toHaveTextContent("3");

      expect(screen.getByTestId("3dataFromHook")).toHaveTextContent("5");
      expect(screen.getByTestId("3dataFromSelector")).toHaveTextContent("5");

      expect(anotherAsyncMock).toHaveBeenCalledWith("life, the universe, etc?");
      expect(anotherAsyncMock).toHaveBeenCalledWith(
        "How many pieces of toast?"
      );
      expect(anotherAsyncMock).toHaveBeenCalledTimes(2);

      expect(yetAnotherAsyncMock).toHaveBeenCalledWith(
        "What time is it?",
        "in EST please."
      );
      expect(yetAnotherAsyncMock).toHaveBeenCalledTimes(1);
    });
  });
});
