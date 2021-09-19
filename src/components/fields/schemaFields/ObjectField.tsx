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

import React from "react";
import { SchemaFieldProps } from "@/components/fields/propTypes";
import { fieldLabel } from "@/components/fields/fieldUtils";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";

type OwnProps = {
  /**
   * A manual description field. Allows custom options pages to pass in status messages about the field, e.g., that
   * an exact schema could not be determined.
   */
  description?: React.ReactNode;
};

const ObjectField: React.FunctionComponent<
  SchemaFieldProps<unknown> & OwnProps
> = (props) => {
  const { name, label, schema, description } = props;
  return (
    <ConnectedFieldTemplate
      {...props}
      label={label ?? fieldLabel(name)}
      description={description ?? schema.description}
      as={ObjectWidget}
    />
  );
};

export default ObjectField;
