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
import { validateRegistryId } from "@/types/helpers";
import { joinName } from "@/utils";
import { partial } from "lodash";
import React from "react";

export const REMOTE_METHOD_ID = validateRegistryId("@pixiebrix/http");

type RemoteMethodOptionsProps = {
  name: string;
  configKey: string;
};

const RemoteMethodOptions: React.FunctionComponent<
  RemoteMethodOptionsProps
> = ({ name, configKey }) => {
  const configName = partial(joinName, name, configKey);

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
        name={configName("data")}
        schema={inputProperties.data}
        defaultType="object"
      />
    </div>
  );
};

export default RemoteMethodOptions;
