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

import React, { useMemo } from "react";
import { type BrickOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { partial } from "lodash";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { type Schema } from "../../types/schemaTypes";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import { joinName } from "../../utils/formUtils";
import { useSelector } from "react-redux";
import { selectKnownVarsForActiveNode } from "@/components/fields/schemaFields/widgets/varPopup/varSelectors";
import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import { MOD_VARIABLE_REFERENCE } from "../../runtime/extendModVariableContext";
import type VarMap from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { assertNotNullish, type Nullishable } from "../../utils/nullishUtils";

function schemaWithKnownVariableNames(varMap: Nullishable<VarMap>): Schema {
  const map = varMap?.getMap() ?? {};
  // eslint-disable-next-line security/detect-object-injection -- compile time constant
  const modVars = map[KnownSources.MOD]?.[MOD_VARIABLE_REFERENCE];
  // Filter out the symbols on the ExistenceNode
  const knownVariableNames = Object.keys(modVars ?? {}).filter(
    (x) => typeof x === "string",
  );

  const schema = new AssignModVariable().inputSchema;

  assertNotNullish(
    schema.properties,
    "AssignModVariable inputSchema.properties is required",
  );

  return {
    properties: {
      ...schema.properties,
      variableName: {
        ...(schema.properties.variableName as UnknownObject),
        // Provide as examples, the creator can still create a new variable
        examples: knownVariableNames,
      },
    },
  };
}

const AssignModVariableOptions: React.FC<BrickOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = joinName(name, configKey);
  const configName = partial(joinName, basePath);
  const varMap = useSelector(selectKnownVarsForActiveNode);

  // Add examples to the schema
  const { properties } = useMemo(
    () => schemaWithKnownVariableNames(varMap),
    [varMap],
  );

  assertNotNullish(
    properties,
    "schema properties are required to assign mod variable options",
  );

  return (
    <>
      <SchemaField
        name={configName("variableName")}
        schema={properties.variableName as Schema}
        isRequired
      />
      <SchemaField
        name={configName("value")}
        schema={properties.value as Schema}
        isRequired
      />
    </>
  );
};

export default AssignModVariableOptions;
