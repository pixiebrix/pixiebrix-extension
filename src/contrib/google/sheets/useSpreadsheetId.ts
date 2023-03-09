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
import { type Expression, type RegistryId } from "@/core";
import { joinName } from "@/utils";
import { useEffect, useReducer, useState } from "react";
import { isExpression } from "@/runtime/mapArgs";
import {
  keyToFieldValue,
  type ServiceSlice,
} from "@/components/fields/schemaFields/serviceFieldUtils";
import { isServiceValue } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isEqual } from "lodash";
import useDependency from "@/services/useDependency";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type SpreadsheetState = {
  spreadsheetId: string | null;

  /**
   * The service id, if brick is providing a sheet via integration configuration.
   */
  serviceId: RegistryId | null;

  /** True if the spreadsheetId field is loading */
  isLoading: boolean;

  error: unknown;
};

const initialState: SpreadsheetState = {
  spreadsheetId: null,
  isLoading: true,
  serviceId: null,
  error: null,
};

const spreadsheetSlice = createSlice({
  name: "spreadsheet",
  initialState,
  reducers: {
    setSpreadsheetLiteral(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.spreadsheetId = action.payload;
      state.serviceId = null;
      state.error = null;
    },
  },
});

/**
 * Hook to get the Google Sheets spreadsheetId from an integration configuration or direct input.
 * @param basePath brick configuration path
 */
function useSpreadsheetId(basePath: string): SpreadsheetState {
  const {
    values: { services },
  } = useFormikContext<ServiceSlice>();

  const [{ value: fieldValue }] = useField<string | Expression>(
    joinName(basePath, "spreadsheetId")
  );

  const [state, dispatch] = useReducer(spreadsheetSlice.reducer, initialState);

  const serviceDependency = useDependency(state.serviceId);

  // On initial mount, set spreadsheetId directly if it's a literal value.
  // Could instead set this via initialState for useReducer
  useEffect(() => {
    if (!isExpression(fieldValue)) {
      dispatch(spreadsheetSlice.actions.setSpreadsheetLiteral(fieldValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on initial mount
  }, []);

  useEffect(() => {
    if (isServiceValue(fieldValue)) {
      const sheetsService = services.find((service) =>
        isEqual(keyToFieldValue(service.outputKey), fieldValue)
      );
      if (sheetsService) {
        setSheetsServiceId(sheetsService.id);
      }
    } else {
      dispatch(spreadsheetSlice.actions.setSpreadsheetLiteral(fieldValue));
    }
  }, [services, fieldValue]);

  useEffect(() => {
    const config = serviceDependency?.config?.config;
    if (!config) {
      return;
    }

    if (config.spreadsheetId) {
      setSpreadsheetId(config.spreadsheetId);
    }
  }, [serviceDependency]);

  return spreadsheetId;
}

export default useSpreadsheetId;
