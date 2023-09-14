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

import React, { useContext } from "react";
import {
  type SchemaFieldProps,
  type SchemaFieldComponent,
} from "@/components/fields/schemaFields/propTypes";
import BasicSchemaField from "@/components/fields/schemaFields/BasicSchemaField";
import AppApiIntegrationDependencyField from "@/components/fields/schemaFields/AppApiIntegrationDependencyField";
import CssClassField from "./CssClassField";
import HeadingStyleField from "./HeadingStyleField";
import {
  isAppServiceField,
  isCssClassField,
  isHeadingStyleField,
  hasCustomWidget,
} from "./fieldTypeCheckers";
import RootAwareField from "@/components/fields/schemaFields/RootAwareField";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import { get } from "lodash";
import defaultFieldFactory from "@/components/fields/schemaFields/defaultFieldFactory";

const SchemaField: SchemaFieldComponent = (props) => {
  const { schema, uiSchema } = props;
  const { customWidgets } = useContext(SchemaFieldContext);

  if (isAppServiceField(schema)) {
    return <AppApiIntegrationDependencyField {...props} />;
  }

  if (isCssClassField(schema)) {
    return <CssClassField {...props} />;
  }

  if (isHeadingStyleField(schema)) {
    return <HeadingStyleField {...props} />;
  }

  if (hasCustomWidget(uiSchema)) {
    const widget = get(customWidgets, uiSchema["ui:widget"] as string);

    // If the uiWidget is registered, render it. Otherwise, render the default field.
    if (widget) {
      const Component = defaultFieldFactory(
        widget as React.VFC<SchemaFieldProps>
      );
      return <Component {...props} />;
    }
  }

  if (props.name.endsWith(".isRootAware")) {
    // Hide the isRootAware field if rendered as part of config.isRootAware. The field was introduced for
    // backward compatibility when upgrading DOM bricks to be root-aware.
    return <RootAwareField {...props} />;
  }

  return <BasicSchemaField {...props} />;
};

export default SchemaField;
