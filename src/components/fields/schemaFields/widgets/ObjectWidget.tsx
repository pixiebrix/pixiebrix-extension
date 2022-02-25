/* eslint-disable security/detect-object-injection,@typescript-eslint/no-dynamic-delete -- working with object props a lot here */
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

import React, { useCallback, useMemo, useRef } from "react";
import { Button, Form, Table } from "react-bootstrap";
import { SafeString, Schema } from "@/core";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { isEmpty } from "lodash";
import { useField, useFormikContext } from "formik";
import { produce } from "immer";
import { freshIdentifier, joinName } from "@/utils";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { getFieldNamesFromPathString } from "@/runtime/pathHelpers";
import { UnknownObject } from "@/types";

type PropertyRowProps = {
  name: string;
  readOnly: boolean;
  schema: Schema;
  onDelete?: () => void;
  onRename?: (newName: string) => void;
  isRequired?: boolean;
};

type RowProps = {
  parentSchema: Schema;
  name: string;
  property: string;
  defined: boolean;
  onDelete: (prop: string) => void;
  onRename: (oldProp: string, newProp: string) => void;
};

const CompositePropertyRow: React.FunctionComponent<PropertyRowProps> = ({
  name,
  schema,
  isRequired,
}) => (
  <tr>
    <td colSpan={2}>
      <SchemaField
        hideLabel
        isObjectProperty
        isRequired={isRequired}
        name={name}
        schema={schema}
      />
    </td>
  </tr>
);

const ValuePropertyRow: React.FunctionComponent<PropertyRowProps> = ({
  readOnly,
  onDelete,
  onRename,
  schema,
  isRequired,
  ...props
}) => {
  const [field] = useField(props);

  const updateName = useCallback(
    ({ target }: React.FocusEvent<HTMLInputElement>) => {
      onRename?.(target.value);
    },
    [onRename]
  );

  const currentProperty = getFieldNamesFromPathString(field.name)[1];

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
        <SchemaField
          hideLabel
          isObjectProperty
          {...field}
          schema={schema}
          isRequired={isRequired}
        />
      </td>
    </tr>
  );
};

const ObjectFieldRow: React.FunctionComponent<RowProps> = ({
  parentSchema,
  defined,
  name,
  property,
  onDelete,
  onRename,
}) => {
  const propertySchema: Schema = useMemo(() => {
    // As of v3, we allow object props of any type, not just string
    const defaultSchema: Schema = {};
    const rawSchema = defined
      ? parentSchema.properties[property]
      : parentSchema.additionalProperties ?? defaultSchema;

    return typeof rawSchema === "boolean" ? defaultSchema : rawSchema;
  }, [
    defined,
    parentSchema.properties,
    parentSchema.additionalProperties,
    property,
  ]);

  const isRequired = parentSchema.required?.includes(property) ?? false;

  const PropertyRowComponent = useMemo(
    () => getPropertyRow(propertySchema),
    [propertySchema]
  );

  const deleteProp = useCallback(() => {
    onDelete(property);
  }, [property, onDelete]);

  const renameProp = useCallback(
    (newProp: string) => {
      onRename(property, newProp);
    },
    [property, onRename]
  );

  return (
    <PropertyRowComponent
      key={property}
      name={name}
      readOnly={defined}
      schema={propertySchema}
      onDelete={defined ? undefined : deleteProp}
      onRename={defined ? undefined : renameProp}
      isRequired={isRequired}
    />
  );
};

export function getPropertyRow(
  schema: Schema
): React.FunctionComponent<PropertyRowProps> {
  switch (schema?.type) {
    case "array":
    case "object":
      return CompositePropertyRow;
    default: {
      return ValuePropertyRow;
    }
  }
}

type ObjectValue = UnknownObject;

const ObjectWidget: React.FC<SchemaFieldProps> = (props) => {
  const { name, schema } = props;

  // Allow additional properties for empty schema (empty schema allows shape)
  const additionalProperties = isEmpty(schema) || schema.additionalProperties;

  // Helpers.setValue changes on every render, so use setFieldValue instead
  // https://github.com/formium/formik/issues/2268
  const [field] = useField<ObjectValue>(props);
  const { setFieldValue } = useFormikContext();

  // UseRef indirection layer so the callbacks below don't re-calculate on every change
  const valueRef = useRef(field.value);
  valueRef.current = field.value ?? {};

  const [properties, declaredProperties] = useMemo(() => {
    const declared = schema.properties ?? {};
    const additional = Object.fromEntries(
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
        produce(valueRef.current, (draft) => {
          if (draft != null) {
            delete draft[property];
          }
        })
      );
    },
    [name, setFieldValue, valueRef]
  );

  const onRename = useCallback(
    (oldProp: string, newProp: string) => {
      if (oldProp !== newProp) {
        const previousValue = valueRef.current;

        console.debug("Renaming property", {
          newProp,
          oldProp,
          previousValue,
        });

        setFieldValue(
          name,
          produce(previousValue, (draft) => {
            draft[newProp] = draft[oldProp] ?? "";
            delete draft[oldProp];
          })
        );
      }
    },
    [name, setFieldValue, valueRef]
  );

  const addProperty = useCallback(() => {
    setFieldValue(
      name,
      produce(valueRef.current, (draft) => {
        const prop = freshIdentifier("property" as SafeString, [
          ...Object.keys(draft),
        ]);
        draft[prop] = "";
      })
    );
  }, [name, setFieldValue, valueRef]);

  return (
    <div>
      <Table size="sm" className="mb-0">
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <ObjectFieldRow
              key={property}
              parentSchema={schema}
              name={
                // Always use nesting even if property name is empty
                property == null || property === ""
                  ? `${field.name}.`
                  : joinName(field.name, property)
              }
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
    </div>
  );
};

export default ObjectWidget;
