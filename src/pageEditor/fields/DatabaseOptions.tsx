/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { Schema } from "@/core";
import { joinName } from "@/utils";
import { partial } from "lodash";
import React from "react";
import AppServiceField from "@/components/fields/schemaFields/AppServiceField";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { SERVICE_BASE_SCHEMA } from "@/services/serviceUtils";
import DatabaseField from "@/pageEditor/fields/DatabaseField";

const keySchema: Schema = {
  type: "string",
  title: "Key",
  description: "The unique key for the record",
};

const mergeStrategySchema: Schema = {
  type: "string",
  title: "Merge Strategy",
  description:
    "Strategy to update the record if it already exists (default: replace)",
  enum: ["replace", "shallow", "deep", "deep_append"],
  default: "replace",
};

const valueSchema: Schema = {
  type: "object",
  title: "Value",
  description: "The data to store in the database",
  additionalProperties: true,
};

const missingKeySchema: Schema = {
  type: "string",
  title: "Missing Behavior",
  description: "Behavior if the key does not exist",
  enum: ["blank", "error"],
  default: "error",
};

const serviceSchema: Schema = {
  $ref: `${SERVICE_BASE_SCHEMA}${PIXIEBRIX_SERVICE_ID}`,
};

export type DatabaseGetPutOptionsProps = {
  name: string;
  configKey: string;
};

type DatabaseOptionsProps = DatabaseGetPutOptionsProps & {
  showValueField: boolean;
};

const DatabaseOptions: React.FC<DatabaseOptionsProps> = ({
  name,
  configKey,
  showValueField,
}) => {
  const configName = partial(joinName, name, configKey);

  return (
    <div>
      <SchemaField name={configName("key")} schema={keySchema} isRequired />

      <DatabaseField name={configName("databaseId")} />

      {showValueField ? (
        <>
          <SchemaField
            name={configName("mergeStrategy")}
            schema={mergeStrategySchema}
          />
          <SchemaField
            name={configName("value")}
            schema={valueSchema}
            isRequired
          />
        </>
      ) : (
        <SchemaField
          name={configName("missingKey")}
          schema={missingKeySchema}
        />
      )}

      <AppServiceField name={configName("service")} schema={serviceSchema} />
    </div>
  );
};

export default DatabaseOptions;
