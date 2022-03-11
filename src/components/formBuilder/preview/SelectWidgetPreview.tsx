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

const RjsfSelectWidget = RjsfTheme.widgets.SelectWidget;

const SelectWidgetPreview: React.VFC<WidgetProps> = (props) => {
  // If Select Options is a variable, then `props.schema.enum` holds the name of the variable (i.e. string).
  const { enum: values } = props.schema;
  if (typeof values === "string") {
    // @ts-expect-error -- enumNames is a valid property of the RJSF schema.
    const { enumNames: labels } = props.schema;
    const enumOptions = [
      {
        value: values,
        label: typeof labels === "string" ? labels : values,
      },
    ];

    const schema = {
      ...props.schema,
      enum: [values],
      enumNames: typeof labels === "string" ? labels : undefined,
    };

    return (
      <RjsfSelectWidget
        {...props}
        disabled
        options={{ enumOptions }}
        schema={schema}
        value={values}
      />
    );
  }

  return <RjsfSelectWidget {...props} />;
};

export default SelectWidgetPreview;
