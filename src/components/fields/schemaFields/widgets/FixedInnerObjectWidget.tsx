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

import React, { useMemo } from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import genericOptionsFactory from "@/components/fields/schemaFields/genericOptionsFactory";
import { type Schema } from "@/core";
import WorkshopMessageWidget from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";

/**
 * A widget for rendering a nested object with fixed properties.
 * @param props
 * @constructor
 * @see isCustomizableObjectSchema
 */
const FixedInnerObjectWidget: React.FC<SchemaFieldProps> = (props) => {
  const { name, schema } = props;

  const Fields = useMemo(() => {
    let objectSchema = schema;

    if (schema.oneOf) {
      const matches = objectSchema.oneOf.filter(
        (x) => typeof x !== "boolean" && x.type === "object"
      );

      if (matches.length > 1) {
        return WorkshopMessageWidget;
      }

      objectSchema = matches[0] as Schema;
    }

    if (schema.allOf || schema.anyOf) {
      return WorkshopMessageWidget;
    }

    if (objectSchema.type !== "object") {
      // Bail if somehow a non-object schema was passed in
      return WorkshopMessageWidget;
    }

    return genericOptionsFactory(objectSchema, null, {
      preserveSchemaOrder: true,
    });
  }, [schema]);

  return <Fields name={name} />;
};

export default FixedInnerObjectWidget;
