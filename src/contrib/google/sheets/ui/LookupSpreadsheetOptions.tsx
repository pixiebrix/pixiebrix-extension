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
import { type Schema } from "@/types/schemaTypes";
import TabField from "@/contrib/google/sheets/ui/TabField";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { LOOKUP_SCHEMA } from "@/contrib/google/sheets/bricks/lookup";
import { isEmpty } from "lodash";
import { isExpression, toExpression } from "@/utils/expressionUtils";
import RequireGoogleSheet from "@/contrib/google/sheets/ui/RequireGoogleSheet";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import useAsyncEffect from "use-async-effect";
import hash from "object-hash";
import { joinName } from "@/utils/formUtils";
import { getHeaders } from "@/contrib/google/sheets/core/sheetsApi";

function headerFieldSchemaForHeaders(headers: string[]): Schema {
  return {
    type: "string",
    title: "Column Header",
    description: "The column header to use for the lookup",
    enum: headers,
  };
}

const HeaderField: React.FunctionComponent<{
  name: string;
  googleAccount: SanitizedIntegrationConfig | null;
  spreadsheetId: string | null;
  tabName: string | Expression;
}> = ({ name, googleAccount, spreadsheetId, tabName }) => {
  const [{ value: header }, , { setValue: setHeader }] = useField<
    string | Expression
  >(name);

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
      if (isExpression(header) && !isEmpty(header.__value__)) {
        return;
      }

      // Set to empty nunjucks expression if no headers have loaded
      if (isEmpty(headers)) {
        await setHeader(toExpression("nunjucks", ""));
        return;
      }

      // Don't modify if the header name is still valid
      if (typeof header === "string" && headers.includes(header)) {
        return;
      }

      // Remaining cases are either empty expression or invalid, selected header, so set to first header
      await setHeader(headers[0]);
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
      schema={fieldSchema}
      isRequired
      defaultType="select"
    />
  );
};

const LookupSpreadsheetOptions: React.FunctionComponent<BrickOptionProps> = ({
  name,
  configKey,
}) => {
  const blockConfigPath = joinName(name, configKey);

  const [{ value: tabName }] = useField<string | Expression>(
    joinName(blockConfigPath, "tabName"),
  );

  const filterRowsFieldPath = joinName(blockConfigPath, "filterRows");
  const [{ value: filterRows }] = useField<boolean | undefined>(
    filterRowsFieldPath,
  );

  // For backwards compatibility, we want to show the filters if the field is undefined.
  const showFilters = filterRows === undefined || filterRows;

  return (
    <div className="my-2">
      <SchemaField
        name={joinName(blockConfigPath, "googleAccount")}
        schema={LOOKUP_SCHEMA.properties.googleAccount as Schema}
      />
      <RequireGoogleSheet blockConfigPath={blockConfigPath}>
        {({ googleAccount, spreadsheet }) => (
          <>
            <TabField
              name={joinName(blockConfigPath, "tabName")}
              schema={LOOKUP_SCHEMA.properties.tabName as Schema}
              spreadsheet={spreadsheet}
            />
            <SchemaField
              name={filterRowsFieldPath}
              schema={LOOKUP_SCHEMA.properties.filterRows as Schema}
              defaultType="boolean"
            />
            {showFilters && (
              <>
                <HeaderField
                  name={joinName(blockConfigPath, "header")}
                  googleAccount={googleAccount}
                  spreadsheetId={spreadsheet?.spreadsheetId}
                  tabName={tabName}
                />
                <SchemaField
                  name={joinName(blockConfigPath, "query")}
                  label="Query"
                  description="Value to search for in the column"
                  schema={LOOKUP_SCHEMA.properties.query as Schema}
                  isRequired
                />
                <SchemaField
                  name={joinName(blockConfigPath, "multi")}
                  label="All Matches"
                  description="Toggle on to return an array of matches"
                  schema={LOOKUP_SCHEMA.properties.multi as Schema}
                  isRequired
                />
              </>
            )}
          </>
        )}
      </RequireGoogleSheet>
    </div>
  );
};

export default LookupSpreadsheetOptions;
