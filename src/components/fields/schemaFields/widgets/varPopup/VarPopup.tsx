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

import React, { useEffect, useState } from "react";
import { type FieldInputMode } from "@/components/fields/schemaFields/fieldInputMode";
import {
  getLikelyVariableAtPosition,
  replaceLikelyVariable,
} from "./likelyVariableUtils";
import VarMenu from "./VarMenu";
import { useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";
import fitTextarea from "fit-textarea";
import { type UnknownObject } from "@/types";
import { getPathFromArray } from "@/runtime/pathHelpers";

type VarPopupProps = {
  inputMode: FieldInputMode;
  inputElementRef: React.MutableRefObject<HTMLElement>;
  value: string;
  setValue: (value: string) => void;
};

// A bit of hack to determine if we're in a context where autosuggest is supported. Used to prevent autosuggest from
// breaking service configuration.
const selectAnalysisSliceExists = (state: UnknownObject) =>
  Boolean(state.analysis);

const VarPopup: React.FunctionComponent<VarPopupProps> = ({
  inputMode,
  inputElementRef,
  value,
  setValue,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const analysisSliceExists = useSelector(selectAnalysisSliceExists);
  const { varAutosuggest } = useSelector(selectSettings);
  const autosuggestEnabled = varAutosuggest && analysisSliceExists;

  useEffect(() => {
    if (
      !inputElementRef.current ||
      (inputMode !== "var" && inputMode !== "string") ||
      !autosuggestEnabled
    ) {
      return;
    }

    const onClick = () => {
      if (inputMode === "var") {
        if (!showMenu) {
          setShowMenu(true);
        }

        return;
      }

      if (inputMode === "string") {
        // For string inputs, we always use TextAreas, hence the cast of the ref to HTMLTextAreaElement
        const cursorPosition =
          (inputElementRef.current as HTMLTextAreaElement)?.selectionStart ?? 0;

        if (getLikelyVariableAtPosition(value, cursorPosition).name) {
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
  }, [autosuggestEnabled, inputMode, showMenu, value]);

  if ((inputMode !== "var" && inputMode !== "string") || !autosuggestEnabled) {
    return null;
  }

  const onClose = () => {
    setShowMenu(false);
  };

  const onVarSelect = (selectedPath: string[]) => {
    const fullVariableName = getPathFromArray(selectedPath);
    if (inputMode === "var") {
      setValue(fullVariableName);
    } else if (inputMode === "string") {
      const textElement = inputElementRef.current as HTMLTextAreaElement;
      if (textElement == null) {
        return;
      }

      const cursorPosition = textElement.selectionStart;
      const newValue = replaceLikelyVariable(
        value,
        cursorPosition,
        fullVariableName
      );
      setValue(newValue);
      setTimeout(() => {
        if (textElement == null) {
          return;
        }

        fitTextarea(textElement);
      }, 100);
    }

    onClose();
  };

  return showMenu ? (
    <VarMenu
      inputElementRef={inputElementRef}
      onVarSelect={onVarSelect}
      onClose={onClose}
    />
  ) : null;
};

export default VarPopup;
