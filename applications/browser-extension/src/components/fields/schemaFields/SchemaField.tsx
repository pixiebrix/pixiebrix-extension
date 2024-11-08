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

import React, { useContext } from "react";
import { type SchemaFieldComponent } from "./propTypes";
import BasicSchemaField from "./BasicSchemaField";
import AppApiIntegrationDependencyField from "./AppApiIntegrationDependencyField";
import CssClassField from "./CssClassField";
import HeadingStyleField from "./HeadingStyleField";
import {
  isPixiebrixIntegrationField,
  isCssClassField,
  isHeadingStyleField,
  hasCustomWidget,
} from "./fieldTypeCheckers";
import RootAwareField from "./RootAwareField";
import SchemaFieldContext from "./SchemaFieldContext";
import { get } from "lodash";
import defaultFieldFactory from "./defaultFieldFactory";
import { type CustomWidgetRegistry } from "./schemaFieldTypes";

const SchemaField: SchemaFieldComponent = (props) => {
  const { schema, uiSchema } = props;
  const { customWidgets } = useContext(SchemaFieldContext);

  if (isPixiebrixIntegrationField(schema)) {
    return <AppApiIntegrationDependencyField {...props} />;
  }

  if (isCssClassField(schema)) {
    return <CssClassField {...props} />;
  }

  if (isHeadingStyleField(schema)) {
    return <HeadingStyleField {...props} />;
  }

  if (uiSchema && hasCustomWidget(uiSchema)) {
    const widget = get(
      customWidgets,
      uiSchema["ui:widget"] as keyof CustomWidgetRegistry,
    );

    // If the uiWidget is registered, render it. Otherwise, render the default field.
    if (widget) {
      const Component = defaultFieldFactory(widget);
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

// Need to memoize SchemaField to prevent uiWidgets from repeatedly mounting/unmounting
export default React.memo(SchemaField);
