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

import React from "react";
import { type FieldInputMode } from "@/components/fields/schemaFields/fieldInputMode";
import { replaceLikelyVariable } from "./likelyVariableUtils";
import VarMenu from "./VarMenu";
import fitTextarea from "fit-textarea";
import { getPathFromArray } from "@/runtime/pathHelpers";
import useAttachPopup from "@/components/fields/schemaFields/widgets/varPopup/useAttachPopup";

type VarPopupProps = {
  /**
   * The input mode of the field. VarPopup is supported for `var` and `string` input modes
   */
  inputMode: FieldInputMode;
  /**
   * Reference to the underlying input element/textarea.
   */
  inputElementRef: React.MutableRefObject<HTMLElement>;
  /**
   * The current field value.
   */
  value: string;
  /**
   * Callback to set the field value.
   */
  setValue: (value: string) => void;
};

const VarPopup: React.FunctionComponent<VarPopupProps> = ({
  inputMode,
  inputElementRef,
  value,
  setValue,
}) => {
  const { hideMenu, isMenuShowing, likelyVariable } = useAttachPopup({
    inputMode,
    inputElementRef,
    value,
  });

  if (!isMenuShowing) {
    return null;
  }

  const onVarSelect = (selectedPath: string[]) => {
    const fullVariableName = getPathFromArray(selectedPath);

    switch (inputMode) {
      case "var": {
        setValue(fullVariableName);
        break;
      }

      case "string": {
        const textElement = inputElementRef.current as HTMLTextAreaElement;
        if (textElement == null) {
          return;
        }

        const cursorPosition = textElement.selectionStart;

        // Set the value
        const newValue = replaceLikelyVariable(
          value,
          cursorPosition,
          fullVariableName
        );
        setValue(newValue);

        // Resize the textarea to fit the new value
        setTimeout(() => {
          if (textElement == null) {
            return;
          }

          fitTextarea(textElement);
        }, 100);
        break;
      }

      default: {
        throw new Error(`Unexpected input mode: ${inputMode}`);
      }
    }

    hideMenu();
  };

  return (
    <VarMenu
      inputElementRef={inputElementRef}
      onVarSelect={onVarSelect}
      onClose={hideMenu}
      likelyVariable={likelyVariable}
    />
  );
};

export default VarPopup;
