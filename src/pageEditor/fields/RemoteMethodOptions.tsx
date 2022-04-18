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

import { inputProperties } from "@/blocks/transformers/remoteMethod";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { isTemplateExpression } from "@/runtime/mapArgs";
import { validateRegistryId } from "@/types/helpers";
import { joinName } from "@/utils";
import { useField } from "formik";
import { partial } from "lodash";
import React, { useEffect } from "react";
import { Alert } from "react-bootstrap";

export const REMOTE_METHOD_ID = validateRegistryId("@pixiebrix/http");

type RemoteMethodOptionsProps = {
  name: string;
  configKey: string;
};

export function isJsonString(fieldValue: unknown) {
  if (!isTemplateExpression(fieldValue) || !fieldValue.__value__) {
    return false;
  }

  try {
    const parsed = JSON.parse(fieldValue.__value__);
    return typeof parsed === "object";
  } catch {
    return false;
  }
}

const RemoteMethodOptions: React.FunctionComponent<
  RemoteMethodOptionsProps
> = ({ name, configKey }) => {
  const configName = partial(joinName, name, configKey);
  const dataFieldName = configName("data");

  const [showJsonWarning, setShowJsonWarning] = React.useState(false);
  const [{ value: data }] = useField(dataFieldName);

  useEffect(() => {
    setShowJsonWarning(isJsonString(data));
  }, [data]);

  return (
    <div>
      <SchemaField name={configName("url")} schema={inputProperties.url} />
      <SchemaField
        name={configName("service")}
        schema={inputProperties.service}
      />
      <SchemaField
        name={configName("method")}
        schema={inputProperties.method}
      />
      <SchemaField
        name={configName("params")}
        schema={inputProperties.params}
      />
      <SchemaField
        name={configName("headers")}
        schema={inputProperties.headers}
      />
      <SchemaField
        name={dataFieldName}
        schema={inputProperties.data}
        defaultType="object"
      />
      {showJsonWarning && (
        <Alert variant="warning">
          <p>
            It looks like you're passing a JSON string to this field. Consider
            providing an object instead.
          </p>
        </Alert>
      )}
    </div>
  );
};

export default RemoteMethodOptions;
