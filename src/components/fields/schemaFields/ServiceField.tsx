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

import React from "react";
import { type Schema } from "@/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import FieldTemplate from "@/components/form/FieldTemplate";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import ServiceWidget, {
  type ServiceWidgetProps,
} from "@/components/fields/schemaFields/widgets/ServiceWidget";

export const ServiceFieldDescription: React.FC<{ schema: Schema }> = ({
  schema,
}) => (
  <>
    {schema.description && (
      <>
        <span>{schema.description}</span>
        <br />
      </>
    )}
    <span>
      Select an integration configuration.{" "}
      <a
        href={`${browser.runtime.getURL("options.html")}#/services`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon icon={faCloud} />
        &nbsp;Configure additional integrations here.
      </a>
    </span>
  </>
);

/**
 * A field layout for a schema-driven Service Selector that automatically maintains the services form state (and output keys)
 * @see ServiceDependency
 * @see ServiceWidget
 */
const ServiceField: React.FunctionComponent<ServiceWidgetProps> = ({
  detectDefault = true,
  ...props
}) => {
  const { name, schema } = props;

  // Use FieldTemplate here directly b/c this component is mapping between the Formik state and the options for the
  // select widget.
  return (
    <FieldTemplate
      name={name}
      label={makeLabelForSchemaField(props)}
      description={<ServiceFieldDescription schema={schema} />}
      as={ServiceWidget}
      {...props}
    />
  );
};

export default ServiceField;
