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

import { useField } from "formik";
import { isIntegrationDependencyValueFormat } from "@/components/fields/schemaFields/fieldTypeCheckers";
import { isEmpty } from "lodash";
import { integrationConfigLocator } from "@/background/messenger/api";
import { getErrorMessage } from "@/errors/errorHelpers";
import { getOptionsArgForFieldValue } from "../../../../utils/getOptionsArgForFieldValue";
import { getSheetIdIntegrationOutputKey } from "./getSheetIdIntegrationOutputKey";
import {
  type Expression,
  type OptionsArgs,
} from "../../../../types/runtimeTypes";
import { type IntegrationDependency } from "../../../../integrations/integrationTypes";
import useAsyncState from "@/hooks/useAsyncState";
import hash from "object-hash";
import { type FetchableAsyncState } from "../../../../types/sliceTypes";
import { joinName } from "../../../../utils/formUtils";
import { useContext, useRef } from "react";
import ModIntegrationsContext from "../../../../mods/ModIntegrationsContext";
import { BusinessError } from "@/errors/businessErrors";

async function findSpreadsheetIdFromFieldValue(
  integrationDependencies: IntegrationDependency[],
  spreadsheetIdValue: string | Expression | null,
  optionsArgs: OptionsArgs,
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
    optionsArgs,
  );
  if (
    typeof optionsSpreadsheetIdValue === "string" &&
    !isEmpty(optionsSpreadsheetIdValue)
  ) {
    return optionsSpreadsheetIdValue;
  }

  if (!isIntegrationDependencyValueFormat(spreadsheetIdValue)) {
    throw new Error(
      "Invalid spreadsheetId value, expected integration dependency",
    );
  }

  // At this point, we know the field value is formatted as a variable with the @ prefix, so,
  // if the dependencies passed in are empty, we're not going to be able to match against one
  if (isEmpty(integrationDependencies)) {
    throw new Error(
      "Invalid spreadsheetId variable, please use a Mod Inputs variable instead",
    );
  }

  const sheetIdIntegrationDependencyOutputKey =
    getSheetIdIntegrationOutputKey(spreadsheetIdValue);
  const sheetIdIntegrationDependency = integrationDependencies.find(
    ({ outputKey }) => outputKey === sheetIdIntegrationDependencyOutputKey,
  );

  if (!sheetIdIntegrationDependency) {
    throw new BusinessError(
      "Unable to locate a matching Google Sheets integration configuration on this mod, please use a Mod Inputs variable instead",
    );
  }

  const { integrationId, configId } = sheetIdIntegrationDependency;

  if (!configId) {
    throw new BusinessError(
      "No configuration selected for the Google Sheets integration",
    );
  }

  const sanitizedIntegrationConfig =
    await integrationConfigLocator.findSanitizedIntegrationConfig(
      integrationId,
      configId,
    );
  const configSpreadsheetId = sanitizedIntegrationConfig.config?.spreadsheetId;

  if (!configSpreadsheetId) {
    throw new Error(
      "Could not find spreadsheetId in integration configuration: " +
        JSON.stringify(sanitizedIntegrationConfig),
    );
  }

  return configSpreadsheetId;
}

/**
 * Hook to get the Google Sheets spreadsheetId from an integration configuration or direct input.
 */
function useSpreadsheetId(
  blockConfigPath: string,
): FetchableAsyncState<string | null> {
  const { integrationDependencies } = useContext(ModIntegrationsContext);

  const [{ value: fieldValue }, , { setError }] = useField<string | Expression>(
    joinName(blockConfigPath, "spreadsheetId"),
  );

  const [{ value: optionsArgs }] = useField<OptionsArgs>("optionsArgs");

  // Provide null, so undefined isn't returned from useAsyncState if spreadsheetId is null
  const lastGoodSpreadsheetId = useRef<string | null>(null);

  return useAsyncState<string | null>(async () => {
    try {
      const result = await findSpreadsheetIdFromFieldValue(
        integrationDependencies,
        fieldValue,
        optionsArgs,
      );
      setError(undefined);
      if (result != null) {
        lastGoodSpreadsheetId.current = result;
      }

      return lastGoodSpreadsheetId.current;
    } catch (error) {
      setError(getErrorMessage(error));
      return null;
    }
  }, [hash({ fieldValue, integrationDependencies, optionsArgs })]);
}

export default useSpreadsheetId;
