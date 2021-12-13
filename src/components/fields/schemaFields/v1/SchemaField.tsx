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

import { SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import React, { useContext, useMemo } from "react";
import SchemaFieldContext, {
  getDefaultField,
} from "@/components/fields/schemaFields/SchemaFieldContext";

/**
 * A schema-based field that automatically determines it's layout/widget based on the schema and uiSchema.
 *
 * @see SchemaFieldContext
 * @see getDefaultField
 */
const SchemaField: SchemaFieldComponent = (props) => {
  const { schema } = props;
  const { customFields } = useContext(SchemaFieldContext);

  const Field = useMemo(() => {
    const overrideField = customFields.find((x) => x.match(schema))?.Component;
    return overrideField ?? getDefaultField(schema);
  }, [customFields, schema]);

  return <Field {...props} />;
};

export default SchemaField;
