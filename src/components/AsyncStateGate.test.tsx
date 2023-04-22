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

import { render } from "@testing-library/react";
import React from "react";
import AsyncStateGate, { StandardError } from "@/components/AsyncStateGate";
import { type AsyncState } from "@/hooks/common";

describe("AsyncStateGate", () => {
  it("renders data", () => {
    const state: AsyncState = ["foo", false, null, jest.fn()];
    const wrapper = render(
      <AsyncStateGate state={state}>
        {({ data }) => <div>{data}</div>}
      </AsyncStateGate>
    );

    expect(wrapper.getByText("foo")).toBeVisible();
  });

  it("throws on error by default", () => {
    const state: AsyncState = [null, false, new Error("test error"), jest.fn()];
    expect(() =>
      render(
        <AsyncStateGate state={state}>
          {() => <div>Hello world!</div>}
        </AsyncStateGate>
      )
    ).toThrow("test error");
  });

  it("renders loader", () => {
    const state: AsyncState = [null, true, null, jest.fn()];
    const wrapper = render(
      <AsyncStateGate state={state}>
        {({ data }) => <div>{data}</div>}
      </AsyncStateGate>
    );

    expect(wrapper.getByTestId("loader")).toBeVisible();
  });

  it("renders error component", () => {
    const state: AsyncState = [null, false, new Error("test error"), jest.fn()];
    const wrapper = render(
      <AsyncStateGate
        state={state}
        renderError={(props) => <StandardError {...props} />}
      >
        {({ data }) => <div>{data}</div>}
      </AsyncStateGate>
    );

    expect(wrapper.container).toHaveTextContent(
      "Error fetching data: test error"
    );
    expect(wrapper.getByText("Try again")).toBeVisible();
  });
});
