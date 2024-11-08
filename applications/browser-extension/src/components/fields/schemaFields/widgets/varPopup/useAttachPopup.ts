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

import { useSelector } from "react-redux";
import { selectSettings } from "../../../../../store/settings/settingsSelectors";
import {
  useEffect,
  useReducer,
  type MutableRefObject,
  useCallback,
  useContext,
} from "react";
import {
  getLikelyVariableAtPosition,
  getVariableAtPosition,
} from "./likelyVariableUtils";
import { type FieldInputMode } from "../../fieldInputMode";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import useDebouncedEffect from "@/hooks/useDebouncedEffect";

import { waitAnimationFrame } from "../../../../../utils/domUtils";
import FieldRuntimeContext from "../../FieldRuntimeContext";

type Props = {
  inputMode: FieldInputMode;
  inputElementRef: MutableRefObject<HTMLTextAreaElement | HTMLInputElement>;
  value: string;
};

type State = {
  /**
   * True if the menu is currently showing.
   */
  isMenuShowing: boolean;
  /**
   * The variable that the user is interacting with.
   */
  likelyVariable: string | null;
  /**
   * The index of the start position of the likelyVariable that corresponds with the cursor position in the input element.
   */
  variablePosition: number | null;
};

const initialState: State = {
  isMenuShowing: false,
  likelyVariable: null,
  variablePosition: null,
};

const popupSlice = createSlice({
  name: "popupSlice",
  initialState,
  reducers: {
    hideMenu(state) {
      state.isMenuShowing = false;
      state.likelyVariable = null;
    },
    showMenuForVariable(
      state,
      action: PayloadAction<{
        likelyVariable: string | null;
        variablePosition: number | null;
      }>,
    ) {
      state.isMenuShowing = true;
      state.likelyVariable = action.payload.likelyVariable;
      state.variablePosition = action.payload.variablePosition;
    },
  },
});

// Shouldn't be necessary given FieldRuntimeContext. But it's a good safety check because allowExpressions defaults
// to true in the FieldRuntimeContext.
const selectAnalysisSliceExists = (state: UnknownObject) =>
  Boolean(state.analysis);

/**
 * Hook to attach the variable popup to a field input.
 */
function useAttachPopup({ inputMode, inputElementRef, value }: Props) {
  const analysisSliceExists = useSelector(selectAnalysisSliceExists);
  const { allowExpressions } = useContext(FieldRuntimeContext);
  const { varAutosuggest } = useSelector(selectSettings);

  const [{ isMenuShowing, likelyVariable, variablePosition }, dispatch] =
    useReducer(popupSlice.reducer, initialState);

  const autosuggestEnabled =
    varAutosuggest && allowExpressions && analysisSliceExists;

  const isMenuAvailable =
    (inputMode === "var" || inputMode === "string") && autosuggestEnabled;

  const updateSelection = useCallback(
    (value: string) => {
      if (inputMode !== "var" && inputMode !== "string") {
        return;
      }

      const cursorPosition = inputElementRef.current?.selectionStart ?? 0;

      if (inputMode === "var") {
        const variableName = getVariableAtPosition(value, cursorPosition);
        dispatch(
          popupSlice.actions.showMenuForVariable({
            likelyVariable: variableName,
            variablePosition: 0,
          }),
        );
      }

      if (inputMode === "string") {
        const { name: variableName, startIndex } = getLikelyVariableAtPosition(
          value,
          cursorPosition,
          {
            clampPosition: true,
            includeBoundary: true,
          },
        );

        console.debug("getLikelyVariableAtPosition", variableName, {
          value,
          cursorPosition,
        });

        if (variableName) {
          dispatch(
            popupSlice.actions.showMenuForVariable({
              likelyVariable: variableName,
              variablePosition: startIndex,
            }),
          );
        } else if (isMenuShowing) {
          dispatch(popupSlice.actions.hideMenu());
        }
      }
    },
    [inputElementRef, inputMode, isMenuShowing],
  );

  useEffect(() => {
    if (!inputElementRef.current || !isMenuAvailable) {
      return;
    }

    const onClick = () => {
      updateSelection(value);
    };

    const onKeyDown = async (event: KeyboardEvent) => {
      const { key } = event;
      if (key === "ArrowRight" || key === "ArrowLeft") {
        // Ensure the browser has updated the selection in the DOM
        await waitAnimationFrame();

        updateSelection(value);
      } else if ((key === "Escape" || key === "}") && isMenuShowing) {
        dispatch(popupSlice.actions.hideMenu());
      }
    };

    const onKeyPress = (event: KeyboardEvent) => {
      const { key } = event;

      if ((key === "@" || inputMode === "var") && !isMenuShowing) {
        const cursorPosition = inputElementRef.current?.selectionStart ?? 0;
        dispatch(
          popupSlice.actions.showMenuForVariable({
            likelyVariable: null,
            variablePosition: cursorPosition,
          }),
        );
      }

      if (key === ".") {
        updateSelection(value);
      }
    };

    const inputElement = inputElementRef.current;
    inputElement.addEventListener("click", onClick);
    inputElement.addEventListener("keypress", onKeyPress);
    inputElement.addEventListener("keydown", onKeyDown);

    return () => {
      inputElement?.removeEventListener("click", onClick);
      inputElement?.removeEventListener("keypress", onKeyPress);
      inputElement?.removeEventListener("keydown", onKeyDown);
    };
  }, [
    inputElementRef,
    isMenuAvailable,
    inputMode,
    isMenuShowing,
    value,
    updateSelection,
  ]);

  // Update the likely variable as the user types
  useDebouncedEffect(
    value,
    () => {
      // For performance, ignore typing if menu is not already showing. There's a key down trigger for @ in the
      // TextWidget that will show the popup when the user starts typing a variable
      if (!isMenuShowing || !isMenuAvailable) {
        return;
      }

      updateSelection(value);
    },
    {
      delayMillis: 50,
    },
  );

  const hideMenu = useCallback(() => {
    dispatch(popupSlice.actions.hideMenu());
  }, []);

  return {
    isMenuAvailable,
    isMenuShowing,
    likelyVariable,
    variablePosition,
    hideMenu,
  };
}

export default useAttachPopup;
