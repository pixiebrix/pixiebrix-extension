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

import { type KeyPath } from "react-json-tree";
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  defaultMenuOption,
  type MenuOptions,
  moveMenuOption,
} from "@/components/fields/schemaFields/widgets/varPopup/menuFilters";
import { isEqual } from "lodash";

function usePrevious<T>(value: T) {
  const ref = useRef<T | null>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * Hook to navigate the variable popover menu using the keyboard from the input field
 * @param inputElementRef the input field the popover is attached to
 * @param isVisible true iff the popover is visible
 * @param likelyVariable the variable the user is currently editing
 * @param onSelect callback to call when the user selects a variable
 * @param menuOptions the variable popover options
 */
function useKeyboardNavigation({
  inputElementRef,
  isVisible,
  likelyVariable,
  menuOptions,
  onSelect,
}: {
  inputElementRef: MutableRefObject<HTMLElement>;
  isVisible: boolean;
  likelyVariable: string;
  menuOptions: MenuOptions;
  onSelect: (keyPath: string[]) => void;
}) {
  // User's current selection in the variable menu
  const [activeKeyPath, setActiveKeyPath] = useState<KeyPath | null>();
  const prevMenuOptions = usePrevious(menuOptions);
  const prevLikelyVariable = usePrevious(likelyVariable);

  // Set the default active key path
  // menuOptions is not guaranteed to be referentially equal
  // need to deep compare menuOptions against the previous run
  // this causes us to need to manually compare likelyVariable as well
  // See https://github.com/pixiebrix/pixiebrix-extension/issues/7006
  useEffect(() => {
    if (
      !isEqual(prevMenuOptions, menuOptions) ||
      prevLikelyVariable !== likelyVariable
    ) {
      setActiveKeyPath(defaultMenuOption(menuOptions, likelyVariable));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger when the menuOptions or likelyVariable changes
  }, [likelyVariable, menuOptions]);

  const move = useCallback(
    (offset: number) => {
      setActiveKeyPath((activeKeyPath) =>
        moveMenuOption({
          options: menuOptions,
          likelyVariable,
          offset,
          keyPath: activeKeyPath,
        }),
      );
    },
    [menuOptions, likelyVariable],
  );

  // Attach keyboard listeners for navigation
  useEffect(() => {
    const inputElement = inputElementRef.current;

    if (inputElement && isVisible) {
      const handler = (event: KeyboardEvent) => {
        console.debug("keydown", event.key);

        if (event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        }

        if (event.key === "Tab" || event.key === "Enter") {
          event.preventDefault();
          onSelect(activeKeyPath.map(String).reverse());
        }
      };

      inputElement.addEventListener("keydown", handler);

      return () => {
        inputElement?.removeEventListener("keydown", handler);
      };
    }
  }, [inputElementRef, isVisible, activeKeyPath, onSelect, menuOptions, move]);

  return {
    activeKeyPath,
  };
}

export default useKeyboardNavigation;
