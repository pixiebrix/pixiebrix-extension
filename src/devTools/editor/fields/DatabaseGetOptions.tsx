/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { validateRegistryId } from "@/types/helpers";
import React from "react";

export const DATABASE_GET_ID = validateRegistryId("@pixiebrix/data/get");

const keySchema: Schema = {
  type: "string",
  description: "The unique key for the record",
};

const databaseIdSchema: Schema = {
  type: "string",
  description: "The database id",
};

const DatabaseGetOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const configName = `${name}.${configKey}`;

  return (
    <div>
      <SchemaField name={`${configName}.key`} label="Key" schema={keySchema} />

      <SchemaField
        name={`${configName}.databaseId`}
        label="Database Id"
        schema={databaseIdSchema}
      />
    </div>
  );
};

export default DatabaseGetOptions;
