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

import { type MenuOptions } from "@/components/fields/schemaFields/widgets/varPopup/menuFilters";
import useKeyboardNavigation from "@/components/fields/schemaFields/widgets/varPopup/useKeyboardNavigation";
import { renderHook, waitFor } from "@testing-library/react";
import { cloneDeep } from "lodash";

describe("useKeyboardNavigation", () => {
  it("only sets the default active key path when the menu options change, ignoring referential inequality", async () => {
    const onSelect = jest.fn();
    const menuOptions: MenuOptions = [
      ["input", { "@input": { description: {}, icon: {} } }],
    ];
    const inputElementRef = { current: document.createElement("input") };

    const initialProps = {
      inputElementRef,
      isVisible: true,
      likelyVariable: "@input.",
      menuOptions,
      onSelect,
    };

    const { result, rerender } = renderHook(
      (props) => useKeyboardNavigation(props),
      {
        initialProps,
      },
    );

    expect(result.current.activeKeyPath).toStrictEqual([
      "description",
      "@input",
    ]);

    const prevResult = result.current;

    rerender({
      ...initialProps,
      menuOptions: cloneDeep(menuOptions),
    });

    await waitFor(async () => {
      expect(prevResult.activeKeyPath).toBe(result.current.activeKeyPath);
    });
  });

  it("sets the default active key path when the likely variable changes", async () => {
    const onSelect = jest.fn();
    const menuOptions: MenuOptions = [
      ["input", { "@input": { description: {}, icon: {} } }],
    ];
    const inputElementRef = { current: document.createElement("input") };

    const initialProps = {
      inputElementRef,
      isVisible: true,
      likelyVariable: "@inpu",
      menuOptions,
      onSelect,
    };

    const { result, rerender } = renderHook(
      (props) => useKeyboardNavigation(props),
      {
        initialProps,
      },
    );

    expect(result.current.activeKeyPath).toStrictEqual(["@input"]);

    const prevResult = result.current;

    rerender({
      ...initialProps,
      likelyVariable: "@input",
    });

    await waitFor(() => {
      // Active Key Path is deep equal, but not referentially equal
      expect(prevResult.activeKeyPath).not.toBe(result.current.activeKeyPath);
    });

    expect(prevResult.activeKeyPath).toStrictEqual(
      result.current.activeKeyPath,
    );
  });
});
