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

import React, { useMemo } from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { joinName } from "@/utils";
import { partial } from "lodash";
import { useField } from "formik";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { ALERT_PERSISTENT_OPTION, AlertEffect } from "@/blocks/effects/alert";
import { type Schema } from "@/core";

const AlertOptions: React.FC<BlockOptionProps> = ({ name, configKey }) => {
  const basePath = joinName(name, configKey);
  const configName = partial(joinName, basePath);

  const alertTypeFieldName = configName("type");
  const [{ value: alertType }] = useField<string>(alertTypeFieldName);

  const inputSchema = useMemo(() => new AlertEffect().inputSchema, []);

  return (
    <>
      <SchemaField
        name={configName("message")}
        schema={inputSchema.properties.message as Schema}
        isRequired
      />
      <SchemaField
        name={alertTypeFieldName}
        schema={inputSchema.properties.type as Schema}
        isRequired
      />
      {alertType !== ALERT_PERSISTENT_OPTION && (
        <SchemaField
          name={configName("duration")}
          schema={inputSchema.properties.duration as Schema}
        />
      )}
    </>
  );
};

export default AlertOptions;
