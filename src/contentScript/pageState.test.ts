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

import { setPageState } from "@/contentScript/pageState";
import { uuidv4 } from "@/types/helpers";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

describe("pageState", () => {
  it("deep merge triggers event", () => {
    const listener = jest.fn();

    document.addEventListener("statechange", listener);

    const blueprintId = registryIdFactory();

    setPageState({
      namespace: "blueprint",
      data: { foo: { bar: "baz" } },
      mergeStrategy: "deep",
      extensionId: uuidv4(),
      blueprintId,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("deep merges async state", () => {
    const listener = jest.fn();

    document.addEventListener("statechange", listener);

    const blueprintId = registryIdFactory();
    const extensionId = uuidv4();

    setPageState({
      namespace: "blueprint",
      data: {
        asyncState: { isFetching: false, data: "foo", currentData: "foo" },
      },
      mergeStrategy: "deep",
      extensionId: uuidv4(),
      blueprintId,
    });

    const updatedState = setPageState({
      namespace: "blueprint",
      data: { asyncState: { isFetching: true, currentData: null } },
      mergeStrategy: "deep",
      extensionId,
      blueprintId,
    });

    expect(listener).toHaveBeenCalledTimes(2);

    expect(updatedState).toEqual({
      asyncState: { isFetching: true, currentData: null, data: "foo" },
    });
  });
});
