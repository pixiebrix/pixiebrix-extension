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

import { renderHook } from "@testing-library/react-hooks";
import { useOnChangeEffect } from "@/contrib/google/sheets/useOnChangeEffect";
import { isEqual } from "lodash";

describe("useOnChangeEffect", () => {
  it("should run the effect when the value changes", async () => {
    const effect = jest.fn();

    const value = "foo";

    const hookish = renderHook(
      ({ value }) => {
        useOnChangeEffect(value, effect);
      },
      { initialProps: { value } }
    );

    // Not called on the initial render
    expect(effect).not.toHaveBeenCalled();

    hookish.rerender({ value: "bar" });

    expect(effect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledWith("bar", "foo");

    hookish.rerender({ value: "bar" });
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("should use equality comparison", async () => {
    const effect = jest.fn();

    const value = { foo: 42 };

    const hookish = renderHook(
      ({ value }) => {
        useOnChangeEffect(value, effect, isEqual);
      },
      { initialProps: { value } }
    );

    hookish.rerender({ value: { foo: 42 } });

    // Not called on the initial render
    expect(effect).not.toHaveBeenCalled();

    hookish.rerender({ value: { foo: 43 } });

    expect(effect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledWith({ foo: 43 }, value);
  });
});
