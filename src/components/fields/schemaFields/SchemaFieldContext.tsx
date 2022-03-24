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

import React, { createContext } from "react";
import {
  SchemaFieldComponent,
  SchemaFieldProps,
} from "@/components/fields/schemaFields/propTypes";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import { CustomFieldDefinitions } from "@/components/fields/schemaFields/schemaFieldTypes";

export function defaultFieldFactory(
  Widget: React.FC<SchemaFieldProps>
): SchemaFieldComponent {
  if (Widget == null) {
    // This would indicate a problem with the imports b/c all the call sites are passing in an imported component?
    // Circular import
    throw new Error("Widget is required");
  }

  const Field: React.FunctionComponent<SchemaFieldProps> = (props) => {
    const { schema, description } = props;
    return (
      <ConnectedFieldTemplate
        {...props}
        label={makeLabelForSchemaField(props)}
        description={description ?? schema.description}
        as={Widget}
      />
    );
  };

  Field.displayName = `SchemaField(${Widget.displayName})`;
  return Field;
}

/**
 * Context defining custom fields and widgets for schema-based fields.
 */
const SchemaFieldContext = createContext<CustomFieldDefinitions>({
  customFields: [],
  customWidgets: [],
  customToggleModes: [],
});

export default SchemaFieldContext;
