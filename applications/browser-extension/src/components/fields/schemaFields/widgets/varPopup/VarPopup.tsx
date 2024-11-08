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

import React, { useCallback, useEffect } from "react";
import { type FieldInputMode } from "../../fieldInputMode";
import {
  getFullVariableName,
  replaceLikelyVariable,
} from "./likelyVariableUtils";
import VarMenu from "./VarMenu";
import fitTextarea from "fit-textarea";
import useAttachPopup from "./useAttachPopup";
import reportEvent from "../../../../../telemetry/reportEvent";
import { Events } from "../../../../../telemetry/events";

type VarPopupProps = {
  /**
   * The input mode of the field. VarPopup is supported for `var` and `string` input modes
   */
  inputMode: FieldInputMode;
  /**
   * Reference to the underlying input element/textarea.
   */
  inputElementRef: React.MutableRefObject<
    HTMLTextAreaElement | HTMLInputElement
  >;
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
  const { hideMenu, isMenuShowing, likelyVariable, variablePosition } =
    useAttachPopup({
      inputMode,
      inputElementRef,
      value,
    });

  useEffect(() => {
    if (isMenuShowing) {
      reportEvent(Events.VAR_POPOVER_SHOW, {
        inputMode,
      });
    }
  }, [isMenuShowing, inputMode]);

  const onVarSelect = useCallback(
    (selectedPath: string[]) => {
      reportEvent(Events.VAR_POPOVER_SELECT);

      const fullVariableName = getFullVariableName(
        likelyVariable,
        selectedPath,
      );

      switch (inputMode) {
        case "var": {
          // "var" input type is a HTMLInputElement
          setValue(fullVariableName);
          break;
        }

        case "string": {
          // "string" input type is a HTMLTextAreaElement
          const textElement = inputElementRef.current as HTMLTextAreaElement;
          if (textElement == null) {
            return;
          }

          const cursorPosition = textElement.selectionStart;

          // Set the value
          const { newTemplate, newCursorPosition } = replaceLikelyVariable(
            value,
            cursorPosition,
            fullVariableName,
          );
          setValue(newTemplate);

          textElement.setSelectionRange(newCursorPosition, newCursorPosition);

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
    },
    [hideMenu, inputElementRef, inputMode, setValue, value, likelyVariable],
  );

  if (!isMenuShowing) {
    return null;
  }

  return (
    <VarMenu
      inputElementRef={inputElementRef}
      onVarSelect={onVarSelect}
      onClose={hideMenu}
      likelyVariable={likelyVariable}
      variablePosition={variablePosition}
    />
  );
};

export default React.memo(VarPopup);
