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

import { useField, useFormikContext } from "formik";
import { type Expression, type UserOptions } from "@/core";
import { joinName } from "@/utils";
import { useReducer } from "react";
import {
  keyToFieldValue,
  type ServiceSlice,
} from "@/components/fields/schemaFields/serviceFieldUtils";
import { isServiceValueFormat } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isEmpty, isEqual, startsWith } from "lodash";
import { pickDependency } from "@/services/useDependency";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useAsyncEffect } from "use-async-effect";
import { services } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { isVarExpression } from "@/runtime/mapArgs";

type SpreadsheetState = {
  spreadsheetId: string | null;

  error: unknown;
};

const initialState: SpreadsheetState = {
  spreadsheetId: null,
  error: null,
};

const spreadsheetSlice = createSlice({
  name: "spreadsheet",
  initialState,
  reducers: {
    setSpreadsheetId(state, action: PayloadAction<string>) {
      state.spreadsheetId = action.payload;
      state.error = null;
    },
    setLoading(state) {
      state.spreadsheetId = null;
      state.error = null;
    },
    setError(state, action: PayloadAction<unknown>) {
      state.spreadsheetId = null;
      state.error = action.payload;
    },
  },
});

/**
 * Hook to get the Google Sheets spreadsheetId from an integration configuration or direct input.
 * @param basePath brick configuration path
 */
function useSpreadsheetId(basePath: string): string | null {
  const {
    values: { services: servicesValue },
  } = useFormikContext<ServiceSlice>();

  const [{ value: fieldValue }, , { setError }] = useField<string | Expression>(
    joinName(basePath, "spreadsheetId")
  );

  const [{ value: optionsArgs }] = useField<UserOptions>("optionsArgs");

  const [state, dispatch] = useReducer(spreadsheetSlice.reducer, initialState);

  /**
   * Note about when this effect will fire:
   *
   * This async effect has fieldValue as its dependency. This can either be a
   * string spreadsheetId, or a service config, var-expression object, or null.
   *
   * When the user switches between two different GSheets service integrations,
   * the fieldValue will not change, it will stay as this value:
   * {
   *   __type__: "var",
   *   __value__: "@google",
   * }
   *
   * The service selector actually changes the top-level form state to make @google
   * point to a different GSheet integration. By using fieldValue as the effect
   * dependency, we're taking advantage of the fact that object comparison will
   * fail and the effect will fire on every render when a user switches between
   * GSheet integrations, even if the fieldValue is not actually changing.
   */
  useAsyncEffect(async () => {
    dispatch(spreadsheetSlice.actions.setLoading());
    if (
      isVarExpression(fieldValue) &&
      startsWith(fieldValue.__value__, "@options.") &&
      !isEmpty(optionsArgs)
    ) {
      const optionsKey = fieldValue.__value__.replace("@options.", "");
      if (isEmpty(optionsKey)) {
        dispatch(spreadsheetSlice.actions.setSpreadsheetId(null));
        return;
      }

      // Leaving this lint warning for now, this DOES come from user input
      const optionsValue = optionsArgs[optionsKey];
      if (typeof optionsValue === "string") {
        dispatch(spreadsheetSlice.actions.setSpreadsheetId(optionsValue));
      } else {
        dispatch(spreadsheetSlice.actions.setSpreadsheetId(null));
      }
    } else if (isServiceValueFormat(fieldValue)) {
      if (fieldValue == null || isEmpty(servicesValue)) {
        // A service value can be null, but here we don't want to try and load anything if it is null
        dispatch(spreadsheetSlice.actions.setSpreadsheetId(null));
        return;
      }

      try {
        const sheetsService = servicesValue.find((service) =>
          isEqual(keyToFieldValue(service.outputKey), fieldValue)
        );
        if (!sheetsService) {
          throw new Error(
            "Could not find service for spreadsheetId field value: " +
              JSON.stringify(fieldValue)
          );
        }

        const dependency = pickDependency(servicesValue, [sheetsService.id]);
        const sanitizedServiceConfig = await services.locate(
          dependency.id,
          dependency.config
        );
        const configSpreadsheetId =
          sanitizedServiceConfig.config?.spreadsheetId;
        if (!configSpreadsheetId) {
          throw new Error(
            "Could not find spreadsheetId in service configuration: " +
              JSON.stringify(sanitizedServiceConfig)
          );
        }

        if (configSpreadsheetId) {
          dispatch(
            spreadsheetSlice.actions.setSpreadsheetId(configSpreadsheetId)
          );
        }
      } catch (error: unknown) {
        dispatch(spreadsheetSlice.actions.setError(error));
        setError(getErrorMessage(error));
      }
    } else {
      dispatch(spreadsheetSlice.actions.setSpreadsheetId(fieldValue));
    }
  }, [fieldValue]);

  return state.spreadsheetId;
}

export default useSpreadsheetId;
