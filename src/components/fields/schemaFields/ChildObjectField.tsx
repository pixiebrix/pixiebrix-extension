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

import React from "react";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { Card } from "react-bootstrap";
import { inputProperties } from "@/helpers";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import { Schema } from "@/core";
import { isEmpty } from "lodash";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { joinName } from "@/utils";

const FALLBACK_SCHEMA: Schema = {
  type: "object",
  additionalProperties: true,
};

type OwnProps = {
  heading: string;

  /**
   * The error, if there was an error fetching the child schema
   */
  schemaError?: unknown;

  /**
   * True if the child schema is loading
   */
  schemaLoading?: boolean;
};

const ChildContainer: React.FC<{ heading: string }> = ({
  heading,
  children,
}) => (
  <Card>
    <Card.Header>{heading}</Card.Header>
    <Card.Body>{children}</Card.Body>
  </Card>
);

const ChildObjectWidget: React.FC<SchemaFieldProps & OwnProps> = ({
  name,
  schema,
  schemaLoading,
  schemaError,
  heading,
}) => {
  if (schemaLoading) {
    return (
      <ChildContainer heading={heading}>
        <GridLoader />
      </ChildContainer>
    );
  }

  if (schemaError || !schema) {
    return (
      <ChildContainer heading={heading}>
        <ObjectWidget name={name} schema={FALLBACK_SCHEMA} />
      </ChildContainer>
    );
  }

  if (isEmpty(schema?.properties)) {
    return (
      <ChildContainer heading={heading}>
        <span className="text-muted">No parameters</span>
      </ChildContainer>
    );
  }

  return (
    <ChildContainer heading={heading}>
      {schema &&
        Object.entries(inputProperties(schema)).map(([prop, fieldSchema]) => {
          if (typeof fieldSchema === "boolean") {
            throw new TypeError("Expected schema for input property type");
          }

          return (
            <SchemaField
              key={prop}
              name={joinName(name, prop)}
              schema={fieldSchema}
            />
          );
        })}
    </ChildContainer>
  );
};

const ChildObjectField: React.FunctionComponent<SchemaFieldProps & OwnProps> = (
  props
) => (
  <ConnectedFieldTemplate
    {...props}
    description={
      props.schemaError
        ? getErrorMessage(props.schemaError)
        : props.schema?.description
    }
    as={ChildObjectWidget}
  />
);

export default ChildObjectField;
