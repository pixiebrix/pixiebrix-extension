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
import useAsyncState from "@/hooks/useAsyncState";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider, useSelector } from "react-redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";

type TestRootState = {
  dummySlice: {
    greeting: string;
  };
};

const asyncMock = jest.fn().mockResolvedValue(42);

const ValueComponent: React.FunctionComponent = () => {
  // Using our useAsyncState hook
  const { data } = useAsyncState(asyncMock, []);
  // Example of using react-redux's useSelector to get data from the Redux store
  const greeting = useSelector(
    (state: TestRootState) => state.dummySlice.greeting,
  );

  return (
    <div>
      <div data-testid="greeting">{greeting}</div>
      <div data-testid="data">{data}</div>
    </div>
  );
};

/**
 * A dummy slice because configureStore requires at least one reducer.
 */
const dummySlice = createSlice({
  name: "dummySlice",
  initialState: { greeting: "Hello!" } satisfies TestRootState["dummySlice"],
  reducers: {},
});

/**
 * Create a Redux store for use in the tests.
 */
function createTestStore() {
  // Add your reducer(s) and/or middleware here.
  // We've included a dummy slice in the skeleton because Redux throws exception if no reducer is provided
  return configureStore({
    reducer: {
      dummySlice: dummySlice.reducer,
    },
  });
}

describe("asyncStateSlice", () => {
  beforeEach(() => {
    // Reset the mock call history before each test
    jest.clearAllMocks();
  });

  it("fetches async state", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent />
      </Provider>,
    );

    await waitFor(() => {
      expect(asyncMock).toHaveBeenCalledOnce();
    });

    expect(screen.getByTestId("data")).toHaveTextContent("42");
    expect(screen.getByTestId("greeting")).toHaveTextContent("Hello");
  });

  it("computes only once", async () => {
    render(
      <Provider store={createTestStore()}>
        <ValueComponent />
        <ValueComponent />
      </Provider>,
    );

    // FIXME: called 2 times because it's called once per component
    await waitFor(() => {
      expect(asyncMock).toHaveBeenCalledOnce();
    });
  });
});
