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

import { setState } from "@/platform/state/stateController";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import {
  MergeStrategies,
  STATE_CHANGE_JS_EVENT_TYPE,
  StateNamespaces,
} from "@/platform/state/stateTypes";

describe("pageState", () => {
  it("deep merge triggers event", () => {
    const listener = jest.fn();

    document.addEventListener(STATE_CHANGE_JS_EVENT_TYPE, listener);

    const modComponentRef = modComponentRefFactory();

    setState({
      namespace: StateNamespaces.MOD,
      data: { foo: { bar: "baz" } },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("deep merges async state", () => {
    const listener = jest.fn();

    document.addEventListener(STATE_CHANGE_JS_EVENT_TYPE, listener);

    const modComponentRef = modComponentRefFactory();

    setState({
      namespace: StateNamespaces.MOD,
      data: {
        asyncState: { isFetching: false, data: "foo", currentData: "foo" },
      },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    const updatedState = setState({
      namespace: StateNamespaces.MOD,
      data: { asyncState: { isFetching: true, currentData: null } },
      mergeStrategy: MergeStrategies.DEEP,
      modComponentRef,
    });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(updatedState).toEqual({
      asyncState: { isFetching: true, currentData: null, data: "foo" },
    });
  });
});
