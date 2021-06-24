/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useContext, useEffect, useMemo, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FieldProps } from "@/components/fields/propTypes";
import { inputProperties } from "@/helpers";
import { Schema, ServiceDependency, UiSchema } from "@/core";
import { ObjectField } from "@/components/fields/FieldTable";
import { FieldArray, useField, useFormikContext } from "formik";
import { fieldLabel } from "@/components/fields/fieldUtils";
import Select, { OptionsType } from "react-select";
import { uniq, sortBy, isEmpty, identity } from "lodash";
import Creatable from "react-select/creatable";
import BootstrapSwitchButton from "bootstrap-switch-button-react";

const SERVICE_BASE_SCHEMA = "https://app.pixiebrix.com/schemas/services/";

const TextField: React.FunctionComponent<FieldProps<string>> = ({
  schema,
  uiSchema,
  label,
  ...props
}) => {
  const [created, setCreated] = useState([]);
  const [{ value, ...field }, meta, helpers] = useField(props);

  const [creatable, options]: [
    boolean,
    OptionsType<{ value: string }>
  ] = useMemo(() => {
    const values = schema.examples ?? schema.enum;
    const options =
      schema.type === "string" && Array.isArray(values)
        ? sortBy(
            uniq([...created, ...values, value].filter((x) => x != null))
          ).map((value) => ({
            value,
            label: value,
          }))
        : [];
    return [schema?.enum == null, options];
  }, [schema.examples, schema.enum, created, value, schema.type]);

  let control;

  if (options.length > 0 && creatable) {
    control = (
      <Creatable
        isClearable
        options={options}
        onCreateOption={(value) => {
          helpers.setValue(value);
          setCreated(uniq([...created, value]));
        }}
        value={options.find((x) => x.value === value)}
        onChange={(option) => helpers.setValue(option?.value)}
      />
    );
  } else if (options.length > 0 && !creatable) {
    control = (
      <Select
        isClearable
        options={options}
        value={options.find((x) => x.value === value)}
        onChange={(option) => helpers.setValue(option?.value)}
      />
    );
  } else if (typeof value === "object") {
    console.warn("Cannot edit object as text", { schema, value });
    control = <div>Cannot edit object value as text</div>;
  } else if (
    schema.format === "markdown" ||
    uiSchema?.["ui:widget"] === "textarea"
  ) {
    control = (
      <Form.Control
        as="textarea"
        value={value ?? ""}
        {...field}
        isInvalid={!!meta.error}
      />
    );
  } else {
    control = (
      <Form.Control
        type="text"
        value={value ?? ""}
        {...field}
        isInvalid={!!meta.error}
      />
    );
  }

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      {control}
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
      {meta.touched && meta.error && (
        <Form.Control.Feedback type="invalid">
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

function extractServiceIds(schema: Schema): string[] {
  if ("$ref" in schema) {
    return [schema.$ref.slice(SERVICE_BASE_SCHEMA.length)];
  } else if ("anyOf" in schema) {
    return schema.anyOf
      .filter((x) => x != false)
      .flatMap((x) => extractServiceIds(x as Schema));
  } else {
    throw new Error("Expected $ref or anyOf in schema for service");
  }
}

export const ServiceField: React.FunctionComponent<
  FieldProps<string> & { detectDefault?: boolean }
> = ({ label, detectDefault = true, schema, ...props }) => {
  const [{ value, ...field }, meta, helpers] = useField(props);
  const { values } = useFormikContext<{ services: ServiceDependency[] }>();

  const { serviceIds, options } = useMemo(() => {
    const serviceIds = extractServiceIds(schema);
    return {
      serviceIds,
      options: values.services
        .filter((service) => serviceIds.includes(service.id))
        .map((service) => ({
          value: `@${service.outputKey}`,
          label: `@${service.outputKey}`,
        })),
    };
  }, [schema, values.services]);

  useEffect(() => {
    if (value == null && detectDefault && options.length > 0) {
      const ids = extractServiceIds(schema);
      const service = values.services.find((service) =>
        ids.includes(service.id)
      );
      if (service?.outputKey) {
        helpers.setValue(`@${service.outputKey}`);
      }
    }
  }, [
    helpers,
    schema,
    detectDefault,
    value,
    options,
    values.services,
    helpers.setValue,
  ]);

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Select
        options={options}
        value={options.find((x) => x.value === value)}
        onChange={(option) => helpers.setValue(option?.value)}
      />
      {schema.description && (
        <Form.Text className="text-muted">
          A service variable configured for {serviceIds.join(" or ")}
        </Form.Text>
      )}
      {meta.touched && meta.error && (
        <Form.Control.Feedback type="invalid">
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

const BooleanField: React.FunctionComponent<FieldProps<boolean>> = ({
  label,
  schema,
  ...props
}) => {
  const [field, , helpers] = useField(props);

  return (
    <Form.Group>
      <div>
        <Form.Label className="mr-2">
          {label ?? fieldLabel(field.name)}
        </Form.Label>
      </div>
      <BootstrapSwitchButton
        size="sm"
        onstyle="info"
        offstyle="light"
        onlabel="On"
        offlabel="Off"
        checked={field.value ?? false}
        onChange={(value) => helpers.setValue(value)}
      />
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
    </Form.Group>
  );
};

// ok to use object here since we don't have any key-specific logic
// eslint-disable-next-line @typescript-eslint/ban-types
const ArrayField: React.FunctionComponent<FieldProps<object[]>> = ({
  schema,
  label,
  ...props
}) => {
  const [field] = useField(props);

  if (Array.isArray(schema.items)) {
    throw new TypeError("Support for arrays of mixed types is not implemented");
  } else if (typeof schema.items === "boolean") {
    throw new TypeError("Schema required for items");
  }
  const schemaItems = schema.items as Schema;

  return (
    <Form.Group controlId={field.name}>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
      <FieldArray name={field.name}>
        {({ remove, push }) => (
          <>
            <ul className="list-group">
              {(field.value ?? []).map((item: unknown, index: number) => {
                const Renderer = getDefaultField(schemaItems);
                return (
                  <li className="list-group-item" key={index}>
                    <Renderer
                      key={index}
                      name={`${field.name}.${index}`}
                      schema={schemaItems}
                      label={`${label ?? fieldLabel(field.name)} #${index + 1}`}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      Remove Item
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Button onClick={() => push(getDefaultArrayItem(schemaItems))}>
              Add Item
            </Button>
          </>
        )}
      </FieldArray>
    </Form.Group>
  );
};

type FieldComponent<T = unknown> = React.FunctionComponent<FieldProps<T>>;

function makeOneOfField(oneOf: Schema): FieldComponent {
  const Renderer = getDefaultField(oneOf);
  const Component = (props: FieldProps<unknown>) => (
    <Renderer {...props} schema={oneOf} />
  );
  Component.displayName = Renderer.displayName;
  return Component;
}

type TypePredicate = (schema: Schema) => boolean;

const textPredicate = (schema: Schema) => schema.type === "string";
const booleanPredicate = (schema: Schema) => schema.type === "boolean";

function findOneOf(schema: Schema, predicate: TypePredicate): Schema {
  return schema.oneOf?.find(
    (x) => typeof x === "object" && predicate(x)
  ) as Schema;
}

function getDefaultArrayItem(schema: Schema): unknown {
  if (schema.default) {
    return schema.default;
  } else if (textPredicate(schema)) {
    return "";
  } else if (schema.type === "object") {
    return {};
  } else if (findOneOf(schema, booleanPredicate)) {
    return false;
  } else if (findOneOf(schema, textPredicate)) {
    return "";
  } else {
    return null;
  }
}

export function getDefaultField(fieldSchema: Schema): FieldComponent {
  if (fieldSchema.$ref?.startsWith(SERVICE_BASE_SCHEMA)) {
    return ServiceField;
  } else if (fieldSchema.type === "array") {
    return ArrayField;
  } else if (fieldSchema.type === "object") {
    return ObjectField;
  } else if (booleanPredicate(fieldSchema)) {
    // should this be a TextField so it can be dynamically determined?
    return BooleanField;
  } else if (textPredicate(fieldSchema)) {
    return TextField;
  } else if (findOneOf(fieldSchema, booleanPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, booleanPredicate));
  } else if (findOneOf(fieldSchema, textPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, textPredicate));
  } else {
    // number, string, other primitives, etc.
    return TextField;
  }
}

type CustomRenderer = {
  match: (fieldSchema: Schema) => boolean;
  Component: FieldComponent;
};

type CustomControl = {
  match: (fieldSchema: Schema) => boolean;
  Component: FieldComponent;
};

export interface IRenderContext {
  customRenderers: CustomRenderer[];
  customControls: CustomControl[];
}

export const RendererContext = React.createContext<IRenderContext>({
  customRenderers: [],
  customControls: [],
});

export const FieldRenderer: React.FunctionComponent<FieldProps<unknown>> = ({
  schema,
  uiSchema,
  ...props
}) => {
  const { customRenderers } = useContext(RendererContext);
  const Renderer = useMemo(() => {
    const match = customRenderers.find((x) => x.match(schema));
    return match ? match.Component : getDefaultField(schema);
  }, [schema, customRenderers]);
  return <Renderer schema={schema} uiSchema={uiSchema} {...props} />;
};

export interface BlockOptionProps {
  name: string;
  configKey?: string;
  showOutputKey?: boolean;
}

function genericOptionsFactory(
  schema: Schema,
  uiSchema?: UiSchema
): React.FunctionComponent<BlockOptionProps> {
  const element = ({ name, configKey, showOutputKey }: BlockOptionProps) => (
    <>
      {Object.entries(inputProperties(schema)).map(([prop, fieldSchema]) => {
        if (typeof fieldSchema === "boolean") {
          throw new TypeError("Expected schema for input property type");
        }
        // fine because coming from Object.entries for the schema
        // eslint-disable-next-line security/detect-object-injection
        const propUiSchema = uiSchema?.[prop];
        return (
          <FieldRenderer
            key={prop}
            name={[name, configKey, prop].filter(identity).join(".")}
            schema={fieldSchema}
            uiSchema={propUiSchema}
          />
        );
      })}
      {showOutputKey && (
        <FieldRenderer
          name={`${name}.outputKey`}
          label="Output Variable"
          schema={{
            type: "string",
            description: "A key to refer to this brick in subsequent bricks",
          }}
        />
      )}
      {isEmpty(schema) && <div>No options available</div>}
    </>
  );

  element.displayName = `Options Field`;
  return element;
}

export default genericOptionsFactory;
