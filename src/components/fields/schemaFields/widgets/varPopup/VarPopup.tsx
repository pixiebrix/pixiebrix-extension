/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React, { useEffect, useState } from "react";
import { FieldInputMode } from "@/components/fields/schemaFields/fieldInputMode";
import { isNunjucksExpression } from "@/runtime/mapArgs";
import getLikelyVariableAtPosition from "./getLikelyVariableAtPosition";
import VarMenu from "./VarMenu";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";

type VarPopupProps = {
  inputMode: FieldInputMode;
  inputElementRef: React.MutableRefObject<HTMLTextAreaElement>;
  value: unknown;
};

const VarPopup: React.FunctionComponent<VarPopupProps> = ({
  inputMode,
  inputElementRef,
  value,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const { varAnalysis, varAutosuggest } = useSelector(selectSettings);
  const autosuggestEnabled = varAnalysis && varAutosuggest;

  useEffect(() => {
    if (
      !inputElementRef.current ||
      (inputMode !== "var" && inputMode !== "string") ||
      !autosuggestEnabled
    ) {
      return;
    }

    const onClick = (event: MouseEvent) => {
      if (inputMode === "var") {
        if (!showMenu) {
          setShowMenu(true);
        }

        return;
      }

      if (inputMode === "string") {
        const cursorPosition = inputElementRef.current?.selectionStart ?? 0;
        const template = isNunjucksExpression(value)
          ? value.__value__
          : String(value);

        if (getLikelyVariableAtPosition(template, cursorPosition)) {
          if (!showMenu) {
            setShowMenu(true);
          }
        } else if (showMenu) {
          setShowMenu(false);
        }
      }
    };

    const onKeyPress = (event: KeyboardEvent) => {
      const { key } = event;
      if (key === "@" && !showMenu) {
        setShowMenu(true);
      } else if ((key === "Escape" || key === "}") && showMenu) {
        setShowMenu(false);
      }
    };

    const inputElement = inputElementRef.current;
    inputElement.addEventListener("click", onClick);
    inputElement.addEventListener("keypress", onKeyPress);

    return () => {
      inputElement?.removeEventListener("click", onClick);
      inputElement?.removeEventListener("keypress", onKeyPress);
    };
  }, [inputElementRef, inputMode, showMenu, value]);

  if ((inputMode !== "var" && inputMode !== "string") || !autosuggestEnabled) {
    return null;
  }

  return showMenu ? (
    <VarMenu
      onClose={() => {
        setShowMenu(false);
      }}
    />
  ) : null;
};

export default VarPopup;
