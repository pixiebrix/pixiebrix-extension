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

import { renderHook } from "@testing-library/react-hooks";
import useMemoCompare from "./useMemoCompare";
import deepEquals from "fast-deep-equal";

describe("useMemoCompare", () => {
  it("returns same reference for deepEquals", async () => {
    const initial = { foo: 42 };

    const { result, rerender } = renderHook(
      (props) => useMemoCompare(props, deepEquals),
      {
        initialProps: initial,
      },
    );

    expect(result.current).toBe(initial);

    rerender({ foo: 42 });

    expect(result.current).toBe(initial);
  });

  it("returns different reference", async () => {
    const initial = { foo: 42 };

    const { result, rerender } = renderHook(
      (props) => useMemoCompare(props, () => false),
      {
        initialProps: initial,
      },
    );

    expect(result.current).toBe(initial);

    rerender({ foo: 42 });

    expect(result.current).not.toBe(initial);
  });

  it("returns same reference when dependencies don't change", async () => {
    const initial = {
      values: { foo: 42 },
      dependencies: [42, "foo"],
    };

    const { result, rerender } = renderHook(
      ({ values, dependencies }) =>
        useMemoCompare(values, deepEquals, dependencies),
      {
        initialProps: initial,
      },
    );

    expect(result.current).toBe(initial.values);

    rerender({
      values: { foo: 42 },
      dependencies: [42, "foo"],
    });

    expect(result.current).toBe(initial.values);
  });

  it("returns different reference when dependencies change", async () => {
    const initial = {
      values: { foo: 42 },
      dependencies: [42, "foo"],
    };

    const { result, rerender } = renderHook(
      ({ values, dependencies }) =>
        useMemoCompare(values, deepEquals, dependencies),
      {
        initialProps: initial,
      },
    );

    expect(result.current).toBe(initial.values);

    rerender({
      values: { foo: 42 },
      dependencies: [42, "bar"],
    });

    expect(result.current).not.toBe(initial.values);
  });
});
