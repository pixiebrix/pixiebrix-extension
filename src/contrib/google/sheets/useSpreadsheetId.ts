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
import { useEffect, useState } from "react";
import { isExpression } from "@/runtime/mapArgs";
import {
  keyToFieldValue,
  type ServiceSlice,
} from "@/components/fields/schemaFields/serviceFieldUtils";
import { isServiceValue } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isEqual } from "lodash";
import useDependency from "@/services/useDependency";

function useSpreadsheetId(basePath: string): string | null {
  const [{ value: fieldValue }] = useField<string | Expression>(
    joinName(basePath, "spreadsheetId")
  );
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(
    // The value is either the spreadsheetId directly, when using the sheet
    // file picker option, or a var expression for a service key when using
    // a service input. If the value is the spreadsheetId, then we can set it
    // here directly, otherwise we need to wait for the service to load.
    isExpression(fieldValue) ? null : fieldValue
  );
  const [sheetsServiceId, setSheetsServiceId] = useState<RegistryId | null>(
    null
  );
  const {
    values: { services },
  } = useFormikContext<ServiceSlice>();

  useEffect(() => {
    if (isServiceValue(fieldValue)) {
      const sheetsService = services.find((service) =>
        isEqual(keyToFieldValue(service.outputKey), fieldValue)
      );
      if (sheetsService) {
        setSheetsServiceId(sheetsService.id);
      }
    } else {
      setSpreadsheetId(fieldValue);
    }
  }, [services, fieldValue]);

  const sheetsServiceDependency = useDependency(sheetsServiceId);

  useEffect(() => {
    const config = sheetsServiceDependency?.config?.config;
    if (!config) {
      return;
    }

    if (config.spreadsheetId) {
      setSpreadsheetId(config.spreadsheetId);
    }
  }, [sheetsServiceDependency]);

  return spreadsheetId;
}

export default useSpreadsheetId;
