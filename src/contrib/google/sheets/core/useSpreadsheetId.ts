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

import { useField } from "formik";
import { isServiceValueFormat } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isEmpty } from "lodash";
import { pickDependency } from "@/services/useDependency";
import { services } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { getOptionsArgForFieldValue } from "@/utils/getOptionsArgForFieldValue";
import { getSheetServiceOutputKey } from "@/contrib/google/sheets/core/getSheetServiceOutputKey";
import { type Expression, type OptionsArgs } from "@/types/runtimeTypes";
import { type IntegrationDependency } from "@/types/integrationTypes";
import useAsyncState from "@/hooks/useAsyncState";
import hash from "object-hash";
import { type FetchableAsyncState } from "@/types/sliceTypes";
import { joinName } from "@/utils/formUtils";
import { useContext } from "react";
import ModIntegrationsContext from "@/mods/ModIntegrationsContext";

export async function findSpreadsheetId(
  integrationDependencies: IntegrationDependency[],
  spreadsheetIdValue: string | Expression | null,
  optionsArgs: OptionsArgs
): Promise<string | null> {
  // Unselected sheet-picker and select list will both set the field value to null
  if (spreadsheetIdValue == null) {
    return null;
  }

  // Select list will set the field value to the spreadsheetId directly
  if (typeof spreadsheetIdValue === "string") {
    return isEmpty(spreadsheetIdValue) ? null : spreadsheetIdValue;
  }

  // Check for spreadsheetId var value in mod options
  const optionsSpreadsheetIdValue = getOptionsArgForFieldValue(
    spreadsheetIdValue,
    optionsArgs
  );
  if (
    typeof optionsSpreadsheetIdValue === "string" &&
    !isEmpty(optionsSpreadsheetIdValue)
  ) {
    return optionsSpreadsheetIdValue;
  }

  if (!isServiceValueFormat(spreadsheetIdValue)) {
    throw new Error("Invalid spreadsheetId value");
  }

  if (isEmpty(integrationDependencies)) {
    throw new Error(
      "Invalid spreadsheetId variable, please use a Mod Inputs variable instead"
    );
  }

  const serviceOutputKey = getSheetServiceOutputKey(spreadsheetIdValue);
  const integrationDependency = integrationDependencies.find(
    (service) => service.outputKey === serviceOutputKey
  );

  if (!integrationDependency) {
    throw new Error(
      "Unable to locate a matching Google Sheets integration configuration on this mod, please use a Mod Inputs variable instead"
    );
  }

  const dependency = pickDependency(integrationDependencies, [
    integrationDependency.id,
  ]);
  const sanitizedIntegrationConfig = await services.locate(
    dependency.id,
    dependency.config
  );
  const configSpreadsheetId = sanitizedIntegrationConfig.config?.spreadsheetId;

  if (!configSpreadsheetId) {
    throw new Error(
      "Could not find spreadsheetId in integration configuration: " +
        JSON.stringify(sanitizedIntegrationConfig)
    );
  }

  return configSpreadsheetId;
}

/**
 * Hook to get the Google Sheets spreadsheetId from an integration configuration or direct input.
 */
function useSpreadsheetId(
  blockConfigPath: string
): FetchableAsyncState<string | null> {
  const { integrationDependencies } = useContext(ModIntegrationsContext);

  const [{ value: fieldValue }, , { setError }] = useField<string | Expression>(
    joinName(blockConfigPath, "spreadsheetId")
  );

  const [{ value: optionsArgs }] = useField<OptionsArgs>("optionsArgs");

  return useAsyncState<string | null>(async () => {
    try {
      return await findSpreadsheetId(
        integrationDependencies,
        fieldValue,
        optionsArgs
      );
    } catch (error: unknown) {
      setError(getErrorMessage(error));
      return null;
    }
  }, [hash({ fieldValue, integrationDependencies, optionsArgs })]);
}

export default useSpreadsheetId;
