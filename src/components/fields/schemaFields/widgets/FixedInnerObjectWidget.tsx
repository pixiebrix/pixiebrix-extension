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
import { isRealDefinition } from "@/components/fields/schemaFields/schemaUtils";

const FixedInnerObjectWidget: React.VFC<SchemaFieldProps> = (props) => {
  const { name, schema } = props;

  const Fields = useMemo(() => {
    let objectSchema = schema;

    if (schema.oneOf) {
      objectSchema = objectSchema.oneOf
        .filter((x) => isRealDefinition(x))
        .find((x) => (x as Schema).type === "object") as Schema;
    }

    return genericOptionsFactory(objectSchema, null, {
      preserveSchemaOrder: true,
    });
  }, [schema]);

  return <Fields name={name} />;
};

export default FixedInnerObjectWidget;
