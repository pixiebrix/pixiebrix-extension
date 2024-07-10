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

import React, { useState } from "react";
import { type BrickOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { useField } from "formik";
import { type Expression } from "@/types/runtimeTypes";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/bricks/append";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import TabField from "@/contrib/google/sheets/ui/TabField";
import { isEmpty } from "lodash";
import { type Schema } from "@/types/schemaTypes";
import { isExpression } from "@/utils/expressionUtils";
import RequireGoogleSheet from "@/contrib/google/sheets/ui/RequireGoogleSheet";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import useAsyncEffect from "use-async-effect";
import hash from "object-hash";
import { isNullOrBlank } from "@/utils/stringUtils";
import { joinName } from "@/utils/formUtils";
import { getHeaders } from "@/contrib/google/sheets/core/sheetsApi";

function headerFieldSchemaForHeaders(headers: string[]): Schema {
  const headerProperties: Record<string, Schema> = Object.fromEntries(
    headers
      .filter((x) => !isNullOrBlank(x))
      .map((header) => [header, { type: "string" }]),
  );

  if (isEmpty(headerProperties)) {
    return {
      type: "object",
      additionalProperties: true,
    };
  }

  return {
    type: "object",
    properties: headerProperties,
  };
}

const RowValuesField: React.FunctionComponent<{
  name: string;
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheetId: string | null;
  tabName: string | Expression;
}> = ({ name, googleAccount, spreadsheetId, tabName }) => {
  const [{ value: rowValues }, , { setValue: setRowValues }] =
    useField<UnknownObject>(name);

  const [fieldSchema, setFieldSchema] = useState<Schema>(
    headerFieldSchemaForHeaders([]),
  );

  useAsyncEffect(
    async (isMounted) => {
      if (!spreadsheetId) {
        setFieldSchema(headerFieldSchemaForHeaders([]));
        return;
      }

      const headers = await getHeaders({
        googleAccount,
        spreadsheetId,
        tabName: isExpression(tabName) ? tabName.__value__ : tabName,
      });

      if (!isMounted()) {
        return;
      }

      setFieldSchema(headerFieldSchemaForHeaders(headers));

      // Don't modify if it's a non-empty expression (user-typed text, or variable)
      if (isExpression(rowValues) && !isEmpty(rowValues.__value__)) {
        return;
      }

      // Remove any invalid rowValues values
      const invalidKeys = Object.keys(rowValues).filter(
        (header) => !headers.includes(header),
      );
      if (invalidKeys.length > 0) {
        const newRowValues = { ...rowValues };
        for (const key of invalidKeys) {
          // eslint-disable-next-line security/detect-object-injection -- not user input, filtered keys
          delete newRowValues[key];
        }

        await setRowValues(newRowValues);
      }
    },
    // Hash just in case tabName is an expression, and we
    // don't need to run the effect when googleAccount changes,
    // because we can keep headers loaded if the new user
    // still has access to the same spreadsheetId and tabName.
    [hash({ spreadsheetId, tabName })],
  );

  return (
    <SchemaField
      name={name}
      label="Row Values"
      isRequired
      schema={fieldSchema}
    />
  );
};

const AppendSpreadsheetOptions: React.FunctionComponent<BrickOptionProps> = ({
  name,
  configKey,
}) => {
  const blockConfigPath = joinName(name, configKey);

  const [{ value: tabName }] = useField<string | Expression>(
    joinName(blockConfigPath, "tabName"),
  );

  return (
    <div className="my-2">
      <SchemaField
        name={joinName(blockConfigPath, "googleAccount")}
        schema={APPEND_SCHEMA.properties.googleAccount as Schema}
      />
      <RequireGoogleSheet blockConfigPath={blockConfigPath}>
        {({ googleAccount, spreadsheet }) => (
          <>
            <TabField
              name={joinName(blockConfigPath, "tabName")}
              schema={APPEND_SCHEMA.properties.tabName as Schema}
              spreadsheet={spreadsheet}
            />
            <RowValuesField
              name={joinName(blockConfigPath, "rowValues")}
              googleAccount={googleAccount}
              spreadsheetId={spreadsheet?.spreadsheetId}
              tabName={tabName}
            />
          </>
        )}
      </RequireGoogleSheet>
      <SchemaField
        name={joinName(blockConfigPath, "requireAllHeaders")}
        schema={APPEND_SCHEMA.properties.requireAllHeaders as Schema}
      />
      <SchemaField
        name={joinName(blockConfigPath, "requireOnlyKnownHeaders")}
        schema={APPEND_SCHEMA.properties.requireOnlyKnownHeaders as Schema}
      />
      <SchemaField
        name={joinName(blockConfigPath, "requireSheetIsVisible")}
        schema={APPEND_SCHEMA.properties.requireSheetIsVisible as Schema}
      />
    </div>
  );
};

export default AppendSpreadsheetOptions;
