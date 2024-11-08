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

import { render, screen } from "@testing-library/react";
import React from "react";
import AsyncStateGate, { StandardError } from "./AsyncStateGate";
import { valueToAsyncState } from "../utils/asyncStateUtils";
import {
  queryErrorFactory,
  queryLoadingFactory,
  queryUninitializedFactory,
} from "../testUtils/rtkQueryFactories";

describe("AsyncStateGate", () => {
  it("renders loader on uninitialized", () => {
    const state = queryUninitializedFactory();
    render(
      <AsyncStateGate state={state}>
        {({ data }) => <div>{data}</div>}
      </AsyncStateGate>,
    );

    expect(screen.getByTestId("loader")).toBeVisible();
  });

  it("renders data", () => {
    const state = valueToAsyncState("foo");
    render(
      <AsyncStateGate state={state}>
        {({ data }) => <div>{data}</div>}
      </AsyncStateGate>,
    );

    expect(screen.getByText("foo")).toBeVisible();
  });

  it("renders loader", () => {
    const state = queryLoadingFactory();
    render(
      <AsyncStateGate state={state}>
        {({ data }) => <div>{data}</div>}
      </AsyncStateGate>,
    );

    expect(screen.getByTestId("loader")).toBeVisible();
  });

  it("throws on error by default", () => {
    const state = queryErrorFactory(new Error("test error"));
    expect(() =>
      render(
        <AsyncStateGate state={state}>
          {() => <div>Hello world!</div>}
        </AsyncStateGate>,
      ),
    ).toThrow("test error");
  });

  it("renders error component", () => {
    const state = queryErrorFactory(new Error("test error"));
    render(
      <AsyncStateGate
        state={state}
        renderError={(props) => <StandardError {...props} />}
      >
        {({ data }) => <div>{data}</div>}
      </AsyncStateGate>,
    );

    expect(screen.getByText(/error fetching data: test error/i)).toHaveClass(
      "text-danger",
    );
    expect(
      screen.getByRole("button", {
        name: /try again/i,
      }),
    ).toBeVisible();
  });
});
