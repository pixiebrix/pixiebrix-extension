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

import React, { useMemo } from "react";
import { defaultFieldFactory } from "@/components/fields/schemaFields/SchemaFieldContext";
import CssClassWidget from "@/components/fields/schemaFields/widgets/CssClassWidget";
import { getToggleOptions } from "@/components/fields/schemaFields/getToggleOptions";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";

const RawCssClassField = defaultFieldFactory(CssClassWidget);

// Can't be constant because getToggleOptions needs the widgets registry to be initialized
export const getCssClassInputFieldOptions = () =>
  getToggleOptions({
    fieldSchema: {
      type: "string",
    },
    isRequired: false,
    customToggleModes: [],
    isArrayItem: false,
    isObjectProperty: false,
    allowExpressions: true,
  });

const CssClassField: React.VFC<SchemaFieldProps> = (props) => {
  const cssClassInputFieldOptions = useMemo(
    () => getCssClassInputFieldOptions(),
    []
  );

  const enrichedProps = {
    ...props,
    inputModeOptions: cssClassInputFieldOptions,
  } as SchemaFieldProps;

  return <RawCssClassField {...enrichedProps} />;
};

export default CssClassField;
