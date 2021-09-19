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
import FormBuilder from "@/components/formBuilder/FormBuilder";
import { Schema } from "@/core";
import React from "react";
import { OutputKeyField } from "@/components/fields/schemaFields/genericOptionsFactory";

export const FORM_RENDERER_ID = "@pixiebrix/form";

const recordIdSchema: Schema = {
  type: "string",
  description: "Unique identifier for the data record",
};

const FormRendererOptions: React.FC<{
  name: string;
  configKey: string;
  showOutputKey: boolean;
}> = ({ name, configKey, showOutputKey }) => {
  const configName = `${name}.${configKey}`;

  return (
    <div>
      <FormBuilder name={configName} />

      <SchemaField name={`${configName}.recordId`} schema={recordIdSchema} />

      {showOutputKey && <OutputKeyField baseName={name} />}
    </div>
  );
};

export default FormRendererOptions;
