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

import React from "react";
import SelectorSelectorField from "@/components/fields/schemaFields/SelectorSelectorField";
import { CustomFieldDefinitions } from "@/components/fields/schemaFields/SchemaFieldContext";
import { Schema, SchemaDefinition } from "@/core";
import SelectorSelectorWidget from "@/devTools/editor/fields/SelectorSelectorWidget";

export const ClearableSelectorWidget: React.FunctionComponent<{
  name: string;
}> = ({ name }) => <SelectorSelectorWidget isClearable sort name={name} />;

function isSelectorField(fieldSchema: Schema): boolean {
  if (fieldSchema.type === "string" && fieldSchema.format === "selector") {
    return true;
  }

  const isSelector = (x: SchemaDefinition) =>
    typeof x !== "boolean" && isSelectorField(x);

  if ((fieldSchema.oneOf ?? []).some((x) => isSelector(x))) {
    return true;
  }

  if ((fieldSchema.anyOf ?? []).some((x) => isSelector(x))) {
    return true;
  }

  return false;
}

const devtoolFieldOverrides: CustomFieldDefinitions = {
  customFields: [
    {
      match: isSelectorField,
      Component: SelectorSelectorField,
    },
  ],
  customWidgets: [
    {
      match: isSelectorField,
      Component: ClearableSelectorWidget,
    },
  ],
};

export default devtoolFieldOverrides;
