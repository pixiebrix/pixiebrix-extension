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

import React from "react";
import { useFormikContext } from "formik";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { PAGE_EDITOR_DEFAULT_BRICK_API_VERSION } from "@/pageEditor/extensionPoints/base";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { Schema } from "@/core";

export const selectorMatchItemSchema: Schema = {
  items: {
    type: "string",
    format: "selector",
  },
};

const SelectorMatchWidget: React.VFC<SchemaFieldProps> = (props) => {
  const { values: formState } = useFormikContext<FormState>();

  return (
    <FieldRuntimeContext.Provider
      value={{
        apiVersion:
          formState.apiVersion ?? PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
        allowExpressions: false,
      }}
    >
      <ArrayWidget
        schema={selectorMatchItemSchema}
        addButtonCaption="Add Selector"
        {...props}
      />
    </FieldRuntimeContext.Provider>
  );
};

export default SelectorMatchWidget;
