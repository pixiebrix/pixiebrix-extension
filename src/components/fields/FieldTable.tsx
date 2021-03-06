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

import React, { useCallback, useContext, useMemo, useRef } from "react";
import { Form, Button, Table } from "react-bootstrap";
import { Schema } from "@/core";
import { FieldProps } from "@/components/fields/propTypes";
import { fromPairs, isEmpty } from "lodash";
import {
  getDefaultField,
  RendererContext,
} from "@/components/fields/blockOptions";
import { useField, useFormikContext } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import produce from "immer";

interface PropertyRow {
  name: string;
  showActions?: boolean;
  readOnly: boolean;
  schema: Schema;
  onDelete: () => void;
  onRename: (newName: string) => void;
}

const CompositePropertyRow: React.FunctionComponent<PropertyRow> = ({
  name,
  schema,
  showActions,
}) => {
  const Renderer = useMemo(() => getDefaultField(schema), [schema]);
  return (
    <tr>
      <td colSpan={showActions ? 3 : 2}>
        <Renderer name={name} schema={schema} />
      </td>
    </tr>
  );
};

const ComplexObjectValue: React.FunctionComponent<FieldProps<unknown>> = () => (
  <Form.Control plaintext readOnly defaultValue="Complex object" />
);

const SimpleValue: React.FunctionComponent<FieldProps<unknown>> = (props) => {
  const [field, meta] = useField(props);
  return (
    <Form.Control
      type="text"
      {...props}
      value={field.value ?? ""}
      isInvalid={!!meta.error}
    />
  );
};

const ValuePropertyRow: React.FunctionComponent<PropertyRow> = ({
  readOnly,
  onDelete,
  onRename,
  showActions,
  schema,
  ...props
}) => {
  const [field] = useField(props);

  const { customControls } = useContext(RendererContext);

  const isComplex = typeof field.value === "object";

  const ValueComponent = useMemo(() => {
    if (isComplex) {
      return ComplexObjectValue;
    }

    const { Component } = customControls.find((x) => x.match(schema)) ?? {};
    return Component ?? SimpleValue;
  }, [isComplex, customControls, schema]);

  const updateName = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      onRename(e.target.value);
    },
    [onRename]
  );

  const parts = field.name.split(".");
  const currentProperty = parts[parts.length - 1];

  return (
    <tr>
      <td>
        <Form.Control
          type="text"
          readOnly={readOnly}
          defaultValue={currentProperty}
          onBlur={updateName}
        />
      </td>
      <td>
        <ValueComponent {...field} schema={schema} />
      </td>
      {showActions && (
        <td>
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          )}
        </td>
      )}
    </tr>
  );
};

function freshPropertyName(obj: { [key: string]: unknown }) {
  let x = 1;
  while (Object.prototype.hasOwnProperty.call(obj, `property${x}`)) {
    x++;
  }

  return `property${x}`;
}

interface RowProps {
  parentSchema: Schema;
  name: string;
  property: string;
  defined: boolean;
  onDelete: (prop: string) => void;
  onRename: (oldProp: string, newProp: string) => void;
}

const BOOLEAN_SCHEMA: Schema = { type: "string" };
const FALLBACK_SCHEMA: Schema = { type: "string" };

const PropertyRow: React.FunctionComponent<RowProps> = ({
  parentSchema,
  defined,
  name,
  property,
  onDelete,
  onRename,
}) => {
  const propertySchema: Schema = useMemo(() => {
    const rawSchema = defined
      ? parentSchema.properties[property]
      : parentSchema.additionalProperties;

    return typeof rawSchema === "boolean"
      ? BOOLEAN_SCHEMA
      : rawSchema ?? FALLBACK_SCHEMA;
  }, [property, defined, parentSchema]);

  const PropertyRow = useMemo(() => getPropertyRow(propertySchema), [
    propertySchema,
  ]);
  const deleteProp = useCallback(() => onDelete(property), [
    property,
    onDelete,
  ]);
  const renameProp = useCallback(
    (newProp: string) => onRename(property, newProp),
    [property, onRename]
  );

  return (
    <PropertyRow
      key={property}
      name={name}
      readOnly={!!defined}
      schema={propertySchema}
      showActions={!!parentSchema.additionalProperties}
      onDelete={!defined ? deleteProp : undefined}
      onRename={!defined ? renameProp : undefined}
    />
  );
};

type ObjectValue = Record<string, unknown>;

export const ObjectField: React.FunctionComponent<FieldProps<unknown>> = ({
  label,
  schema,
  ...props
}) => {
  const { name } = props;

  // Allow additional properties for empty schema (empty schema allows shape)
  const additionalProperties = isEmpty(schema) || schema.additionalProperties;

  // Helpers.setValue changes on every render, so use setFieldValue instead
  // https://github.com/formium/formik/issues/2268
  const [field] = useField(props);
  const { setFieldValue } = useFormikContext();

  // UseRef indirection layer so the callbacks below don't re-calculate on every change
  const fieldRef = useRef(field);

  const [properties, declaredProperties] = useMemo(() => {
    const declared = schema.properties ?? {};
    const additional = fromPairs(
      Object.entries(field.value ?? {}).filter(
        ([property]) => !declared[property]
      )
    );
    return [[...Object.keys(declared), ...Object.keys(additional)], declared];
  }, [field.value, schema.properties]);

  const onDelete = useCallback(
    (property: string) => {
      setFieldValue(
        name,
        produce(fieldRef.current.value, (draft: ObjectValue) => {
          delete draft[property];
        })
      );
    },
    [name, setFieldValue, fieldRef]
  );

  const onRename = useCallback(
    (oldProp: string, newProp: string) => {
      if (oldProp !== newProp) {
        const previousValue = fieldRef.current.value ?? {};

        console.debug("Renaming property", {
          newProp,
          oldProp,
          previousValue,
        });

        setFieldValue(
          name,
          produce(previousValue, (draft: ObjectValue) => {
            draft[newProp] = draft[oldProp] ?? "";
            delete draft[oldProp];
          })
        );
      }
    },
    [name, setFieldValue, fieldRef]
  );

  const addProperty = useCallback(() => {
    setFieldValue(
      name,
      produce(fieldRef.current.value ?? {}, (draft: ObjectValue) => {
        draft[freshPropertyName(draft)] = "";
      })
    );
  }, [name, setFieldValue, fieldRef]);

  return (
    <Form.Group controlId={field.name}>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Table size="sm">
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Value</th>
            {additionalProperties && <th scope="col">Action</th>}
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <PropertyRow
              key={property}
              parentSchema={schema}
              name={[field.name, property].join(".")}
              property={property}
              defined={Object.prototype.hasOwnProperty.call(
                declaredProperties,
                property
              )}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </tbody>
      </Table>
      {additionalProperties && (
        <Button onClick={addProperty}>Add Property</Button>
      )}
    </Form.Group>
  );
};

export function getPropertyRow(
  schema: Schema
): React.FunctionComponent<PropertyRow> {
  switch (schema?.type) {
    case "array":
    case "object":
      return CompositePropertyRow;
    default: {
      return ValuePropertyRow;
    }
  }
}
