import React, { useMemo } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { Schema } from "@/core";
import { FieldProps } from "@/components/fields/propTypes";
import fromPairs from "lodash/fromPairs";
import Table from "react-bootstrap/Table";
import { getDefaultField } from "@/components/fields/blockOptions";
import { useField } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

interface PropertyRow {
  name: string;
  showActions?: boolean;
  readOnly: boolean;
  schema: Schema;
  onDelete: () => void;
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

const ValuePropertyRow: React.FunctionComponent<PropertyRow> = ({
  readOnly,
  onDelete,
  showActions,
  ...props
}) => {
  const [field, meta, helpers] = useField(props);

  const parts = field.name.split(".");
  const currentProperty = parts[parts.length - 1];

  return (
    <tr>
      <td>
        <Form.Control
          type="text"
          readOnly={readOnly}
          defaultValue={currentProperty}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
            const newProp = e.target.value;
            const newObj = {
              ...field.value,
              [newProp]: field.value[currentProperty],
            };
            delete newObj[currentProperty];
            helpers.setValue(newObj);
          }}
        />
        {/* This screws up the column width */}
        {/*{schema.description && (*/}
        {/*    <Form.Text className="text-muted">{schema.description}</Form.Text>*/}
        {/*)}*/}
      </td>
      <td>
        <Form.Control
          type="text"
          defaultValue={meta.initialValue}
          onChange={field.onChange}
        />
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

function newPropertyName(obj: { [key: string]: unknown }) {
  let x = 1;
  while (obj.hasOwnProperty(`property${x}`)) {
    x++;
  }
  return `property${x}`;
}

export const ObjectField: React.FunctionComponent<FieldProps<unknown>> = ({
  label,
  schema,
  ...props
}) => {
  const [field, , helpers] = useField(props);

  const properties = useMemo(() => {
    const builtin = schema.properties ?? {};
    const additional = fromPairs(
      Object.entries(field.value ?? {}).filter(([x]) => !builtin[x])
    );
    return [...Object.keys(builtin), ...Object.keys(additional)];
  }, [field.value, schema.properties]);

  return (
    <Form.Group controlId={field.name}>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Table size="sm">
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Value</th>
            {schema.additionalProperties && <th scope="col">Action</th>}
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => {
            const definedProperties = schema.properties ?? {};
            const defined = definedProperties.hasOwnProperty(property);
            const propertySchema = defined
              ? schema.properties[property]
              : schema.additionalProperties;
            if (typeof propertySchema === "boolean") {
              throw new Error("Expected schema not boolean");
            }
            const PropertyRow = getPropertyRow(propertySchema);
            return (
              <PropertyRow
                key={property}
                name={`${field.name}.${property}`}
                readOnly={!!defined}
                schema={propertySchema}
                onDelete={
                  !defined
                    ? () => {
                        const newObj = { ...field.value };
                        delete newObj[property];
                        helpers.setValue(newObj);
                      }
                    : undefined
                }
                showActions={!!schema.additionalProperties}
              />
            );
          })}
        </tbody>
      </Table>
      {schema.additionalProperties && (
        <Button
          onClick={() => {
            const current = field.value ?? {};
            helpers.setValue({ ...current, [newPropertyName(current)]: null });
          }}
        >
          Add Property
        </Button>
      )}
    </Form.Group>
  );
};

export function getPropertyRow(
  schema: Schema
): React.FunctionComponent<PropertyRow> {
  switch (schema.type) {
    case "array":
    case "object":
      return CompositePropertyRow;
    default: {
      return ValuePropertyRow;
    }
  }
}
