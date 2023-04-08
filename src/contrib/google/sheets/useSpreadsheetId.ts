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
import { joinName } from "@/utils";
import { useReducer } from "react";
import { type ServiceSlice } from "@/components/fields/schemaFields/serviceFieldUtils";
import { isServiceValueFormat } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isEmpty } from "lodash";
import { pickDependency } from "@/services/useDependency";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useAsyncEffect } from "use-async-effect";
import { services } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { getOptionsArgForFieldValue } from "@/utils/getOptionsArgForFieldValue";
import { getSheetServiceOutputKey } from "@/contrib/google/sheets/getSheetServiceOutputKey";
import { Expression, UserOptions } from "@/types/runtimeTypes";

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

    const optionsValue = getOptionsArgForFieldValue(fieldValue, optionsArgs);
    if (typeof optionsValue === "string" && !isEmpty(optionsValue)) {
      dispatch(spreadsheetSlice.actions.setSpreadsheetId(optionsValue));
      return;
    }

    if (isServiceValueFormat(fieldValue)) {
      if (fieldValue == null) {
        // A service value can be null, but here we don't want to try and load anything if it is null
        dispatch(spreadsheetSlice.actions.setSpreadsheetId(null));
        return;
      }

      try {
        if (isEmpty(servicesValue)) {
          throw new Error(
            "Invalid spreadsheetId variable, please use a Mod Inputs variable instead"
          );
        }

        const serviceOutputKey = getSheetServiceOutputKey(fieldValue);
        const sheetsService = servicesValue.find(
          (service) => service.outputKey === serviceOutputKey
        );

        if (!sheetsService) {
          throw new Error(
            "Unable to locate a matching Google Sheets service integration on this mod, please use a Mod Inputs variable instead"
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

      return;
    }

    dispatch(spreadsheetSlice.actions.setSpreadsheetId(fieldValue));
  }, [fieldValue]);

  return state.spreadsheetId;
}

export default useSpreadsheetId;
