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

import { act, renderHook } from "@testing-library/react-hooks";
import useMemoCompare from "@/hooks/useMemoCompare";
import deepEquals from "fast-deep-equal";

describe("useMemoCompare", () => {
  it("returns same reference for deepEquals", async () => {
    const initial = { foo: 42 };

    const wrapper = renderHook((props) => useMemoCompare(props, deepEquals), {
      initialProps: initial,
    });

    expect(wrapper.result.current).toBe(initial);

    await act(async () => {
      wrapper.rerender({ foo: 42 });
    });

    expect(wrapper.result.current).toBe(initial);
  });

  it("returns different reference", async () => {
    const initial = { foo: 42 };

    const wrapper = renderHook((props) => useMemoCompare(props, () => false), {
      initialProps: initial,
    });

    expect(wrapper.result.current).toBe(initial);

    await act(async () => {
      wrapper.rerender({ foo: 42 });
    });

    expect(wrapper.result.current).not.toBe(initial);
  });
});
