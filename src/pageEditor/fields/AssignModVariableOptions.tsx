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
import { partial } from "lodash";
import { useFormikContext } from "formik";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { type Schema } from "@/types/schemaTypes";
import useAsyncState from "@/hooks/useAsyncState";
import { getPageState } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import { type UnknownObject } from "@/types/objectTypes";
import { joinName } from "@/utils/formUtils";

const AssignModVariableOptions: React.FC<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);
  const configName = partial(joinName, basePath);

  const {
    values: { uuid: extensionId, recipe },
  } = useFormikContext<ModComponentFormState>();

  const { data: modState } = useAsyncState(
    async () =>
      getPageState(thisTab, {
        namespace: "blueprint",
        extensionId,
        blueprintId: recipe?.id,
      }),
    []
  );

  const inputSchema = useMemo(() => {
    const schema = new AssignModVariable().inputSchema;
    return {
      properties: {
        value: schema.properties.value,
        variableName: {
          ...(schema.properties.variableName as UnknownObject),
          examples: Object.keys(modState ?? {}),
        },
      },
    };
  }, [modState]);

  return (
    <>
      <SchemaField
        name={configName("variableName")}
        schema={inputSchema.properties.variableName as Schema}
        isRequired
      />
      <SchemaField
        name={configName("value")}
        schema={inputSchema.properties.value as Schema}
        isRequired
      />
    </>
  );
};

export default AssignModVariableOptions;
