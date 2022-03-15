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

import { WidgetProps } from "@rjsf/core";
import { Theme as RjsfTheme } from "@rjsf/bootstrap-4";
import React from "react";
import { Schema } from "@/core";

const RjsfSelectWidget = RjsfTheme.widgets.SelectWidget;

const SelectWidgetPreview: React.VFC<WidgetProps> = (props) => {
  // If Select Options is a variable, then `props.schema.enum` holds the name of the variable (i.e. string).
  const { enum: enumValues, oneOf } = props.schema;
  if (typeof enumValues === "string" || typeof oneOf === "string") {
    // @ts-expect-error enumValues || oneOf is always a string here
    const varValue: string =
      typeof enumValues === "string" ? enumValues : oneOf;
    const enumOptions = [
      {
        value: varValue,
        label: varValue,
      },
    ];

    const schema: Schema = {
      ...props.schema,
      enum: typeof enumValues === "string" ? [varValue] : undefined,
      oneOf:
        typeof oneOf === "string"
          ? [
              {
                const: varValue,
              },
            ]
          : undefined,
    };

    return (
      <RjsfSelectWidget
        {...props}
        disabled
        options={{ enumOptions }}
        schema={schema}
        value={enumValues}
      />
    );
  }

  if (!Array.isArray(props.options.enumOptions)) {
    return <div>Please fill the values for each option.</div>;
  }

  return <RjsfSelectWidget {...props} />;
};

export default SelectWidgetPreview;
