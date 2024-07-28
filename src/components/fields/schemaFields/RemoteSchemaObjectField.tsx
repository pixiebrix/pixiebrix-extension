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

import React from "react";
import { Card } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type Schema } from "@/types/schemaTypes";
import { isEmpty } from "lodash";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { joinName } from "@/utils/formUtils";
import { inputProperties } from "@/utils/schemaUtils";
import FieldAnnotationAlert from "@/components/annotationAlert/FieldAnnotationAlert";
import { AnnotationType } from "@/types/annotationTypes";
import { type AsyncState } from "@/types/sliceTypes";
import Loader from "@/components/Loader";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";

const FALLBACK_SCHEMA: Schema = {
  type: "object",
  additionalProperties: true,
};

registerDefaultWidgets();

export type RemoteSchemaObjectFieldProps = {
  /**
   * The Formik field name for the field
   */
  name: string;
  /**
   * The display heading for the object widget
   */
  heading: string;
  /**
   * Async state for the remote schema
   */
  remoteSchemaState: AsyncState<Schema | null>;
};

const ChildObjectWidgetContent: React.FC<
  Pick<RemoteSchemaObjectFieldProps, "name" | "remoteSchemaState">
> = ({ name, remoteSchemaState }) => {
  if (remoteSchemaState.isLoading) {
    return <Loader />;
  }

  // If there's an issue loading the schema, show a basic object input so mod developers aren't blocked
  if (remoteSchemaState.error || remoteSchemaState.data == null) {
    return (
      <>
        {remoteSchemaState.error && (
          <FieldAnnotationAlert
            message={getErrorMessage(remoteSchemaState.error)}
            type={AnnotationType.Error}
          />
        )}
        <ObjectWidget name={name} schema={FALLBACK_SCHEMA} />
      </>
    );
  }

  if (isEmpty(remoteSchemaState.data?.properties)) {
    return <span className="text-muted">No parameters</span>;
  }

  const schema = remoteSchemaState.data;
  function isRequired(prop: string): boolean {
    if (!schema.required) {
      return true;
    }

    return schema.required.includes(prop);
  }

  return (
    <>
      {Object.entries(inputProperties(remoteSchemaState.data)).map(
        ([prop, fieldSchema]) => {
          if (typeof fieldSchema === "boolean") {
            throw new TypeError("Expected schema for input property type");
          }

          // If no title, use the schema field name directly for the label, no auto-styling/capitalization
          const label = fieldSchema.title ?? prop;

          return (
            <SchemaField
              key={prop}
              name={joinName(name, prop)}
              label={label}
              schema={fieldSchema}
              isRequired={isRequired(prop)}
            />
          );
        },
      )}
    </>
  );
};

const ChildObjectWidget: React.FC<RemoteSchemaObjectFieldProps> = ({
  name,
  heading,
  remoteSchemaState,
}) => (
  <Card>
    <Card.Header>{heading}</Card.Header>
    <Card.Body>
      <ChildObjectWidgetContent
        name={name}
        remoteSchemaState={remoteSchemaState}
      />
    </Card.Body>
  </Card>
);

const RemoteSchemaObjectField: React.FC<RemoteSchemaObjectFieldProps> = (
  props,
) => <ConnectedFieldTemplate as={ChildObjectWidget} {...props} />;

export default RemoteSchemaObjectField;
