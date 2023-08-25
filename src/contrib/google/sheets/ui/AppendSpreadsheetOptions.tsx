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

import React, { useState } from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { useField } from "formik";
import { type Expression } from "@/types/runtimeTypes";
import { APPEND_SCHEMA } from "@/contrib/google/sheets/bricks/append";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import TabField from "@/contrib/google/sheets/ui/TabField";
import { FormErrorContext } from "@/components/form/FormErrorContext";
import { isEmpty } from "lodash";
import { requireGoogleHOC } from "@/contrib/google/sheets/ui/RequireGoogleApi";
import { type Schema } from "@/types/schemaTypes";
import { isExpression } from "@/utils/expressionUtils";
import RequireGoogleSheet from "@/contrib/google/sheets/ui/RequireGoogleSheet";
import { type SanitizedIntegrationConfig } from "@/types/integrationTypes";
import useAsyncEffect from "use-async-effect";
import { sheets } from "@/background/messenger/api";
import hash from "object-hash";
import { isNullOrBlank } from "@/utils/stringUtils";
import { joinName } from "@/utils/formUtils";
import { type UnknownObject } from "@/types/objectTypes";
import useFlags from "@/hooks/useFlags";

const ANONYMOUS_OBJECT_SCHEMA: Schema = {
  type: "object",
  additionalProperties: true,
};

const RowValuesField: React.FunctionComponent<{
  name: string;
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheetId: string | null;
  tabName: string | Expression;
}> = ({ name, googleAccount, spreadsheetId, tabName }) => {
  const [{ value: rowValues }, , { setValue: setRowValues }] =
    useField<UnknownObject>(name);

  const [fieldSchema, setFieldSchema] = useState<Schema>(
    ANONYMOUS_OBJECT_SCHEMA
  );

  useAsyncEffect(
    async (isMounted) => {
      if (spreadsheetId == null) {
        setFieldSchema(ANONYMOUS_OBJECT_SCHEMA);
        return;
      }

      const headers = await sheets.getHeaders({
        googleAccount,
        spreadsheetId,
        tabName: isExpression(tabName) ? tabName.__value__ : tabName,
      });

      if (!isMounted()) {
        return;
      }

      const headerProperties: Record<string, Schema> = Object.fromEntries(
        headers
          .filter((x) => !isNullOrBlank(x))
          .map((header) => [header, { type: "string" }])
      );

      if (isEmpty(headerProperties)) {
        setFieldSchema(ANONYMOUS_OBJECT_SCHEMA);
        return;
      }

      // Remove any invalid rowValues values
      const invalidKeys = Object.keys(rowValues).filter(
        (header) => !headers.includes(header)
      );
      if (invalidKeys.length > 0) {
        const newRowValues = { ...rowValues };
        for (const key of invalidKeys) {
          // eslint-disable-next-line security/detect-object-injection -- not user input, filtered keys
          delete newRowValues[key];
        }

        await setRowValues(newRowValues);
      }

      setFieldSchema({
        type: "object",
        properties: headerProperties,
      });
    },
    // Hash just in case tabName is an expression, and we
    // don't need to run the effect when googleAccount changes,
    // because we can keep headers loaded if the new user
    // still has access to the same spreadsheetId and tabName.
    [hash({ spreadsheetId, tabName })]
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

const AppendSpreadsheetOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const blockConfigPath = joinName(name, configKey);

  const [{ value: tabName }] = useField<string | Expression>(
    joinName(blockConfigPath, "tabName")
  );

  const { flagOn } = useFlags();

  return (
    <div className="my-2">
      {flagOn("gsheets-pkce-integration") && (
        <SchemaField
          name={joinName(blockConfigPath, "googleAccount")}
          schema={APPEND_SCHEMA.properties.googleAccount as Schema}
        />
      )}
      <RequireGoogleSheet blockConfigPath={blockConfigPath}>
        {({ googleAccount, spreadsheet, spreadsheetFieldSchema }) => (
          <>
            <FormErrorContext.Provider
              value={{
                shouldUseAnalysis: false,
                showUntouchedErrors: true,
                showFieldActions: false,
              }}
            >
              <SchemaField
                name={joinName(blockConfigPath, "spreadsheetId")}
                schema={spreadsheetFieldSchema}
                isRequired
              />
              {
                // The problem with including this inside the nested FormErrorContext.Provider is that we
                // would like analysis to run if this is in text/template mode, but not if it's in select mode.
                // Select mode is more important, so we're leaving it like this for now.
                <TabField
                  name={joinName(blockConfigPath, "tabName")}
                  schema={APPEND_SCHEMA.properties.tabName as Schema}
                  spreadsheet={spreadsheet}
                />
              }
            </FormErrorContext.Provider>
            <RowValuesField
              name={joinName(blockConfigPath, "rowValues")}
              googleAccount={googleAccount}
              spreadsheetId={spreadsheet?.spreadsheetId}
              tabName={tabName}
            />
          </>
        )}
      </RequireGoogleSheet>
    </div>
  );
};

export default requireGoogleHOC(AppendSpreadsheetOptions);
