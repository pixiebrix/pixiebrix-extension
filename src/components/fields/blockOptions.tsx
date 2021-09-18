/* eslint-disable filenames/match-exported */
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

import React, { createContext, useContext, useMemo } from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { inputProperties } from "@/helpers";
import { Schema, UiSchema } from "@/core";
import { ObjectField } from "@/components/fields/FieldTable";
import { compact, isEmpty } from "lodash";
import ServiceField, {
  SERVICE_BASE_SCHEMA,
} from "@/components/fields/schemaFields/ServiceField";
import BooleanField from "@/components/fields/schemaFields/BooleanField";
import TextField from "@/components/fields/schemaFields/TextFields";
import ArrayField from "@/components/fields/schemaFields/ArrayField";
import {
  booleanPredicate,
  findOneOf,
  textPredicate,
} from "@/components/fields/schemaFields/schemaUtils";

type FieldComponent<T = unknown> = React.FunctionComponent<FieldProps<T>>;

function makeOneOfField(oneOf: Schema): FieldComponent {
  const Renderer = getDefaultField(oneOf);
  const Component = (props: FieldProps<unknown>) => (
    <Renderer {...props} schema={oneOf} />
  );
  Component.displayName = Renderer.displayName;
  return Component;
}

export function getDefaultField(fieldSchema: Schema): FieldComponent {
  if (fieldSchema.$ref?.startsWith(SERVICE_BASE_SCHEMA)) {
    return ServiceField;
  }

  if (fieldSchema.type === "array") {
    return ArrayField;
  }

  if (fieldSchema.type === "object") {
    return ObjectField;
  }

  if (booleanPredicate(fieldSchema)) {
    return BooleanField;
  }

  if (textPredicate(fieldSchema)) {
    return TextField;
  }

  if (findOneOf(fieldSchema, booleanPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, booleanPredicate));
  }

  if (findOneOf(fieldSchema, textPredicate)) {
    return makeOneOfField(findOneOf(fieldSchema, textPredicate));
  }

  if (isEmpty(fieldSchema)) {
    // An empty field schema supports any value. For now, provide an object field since this just shows up
    // in the @pixiebrix/http brick.
    // https://github.com/pixiebrix/pixiebrix-extension/issues/709
    return ObjectField;
  }

  // Number, string, other primitives, etc.
  return TextField;
}

/**
 * A form field, including label, error message, etc.
 */
type CustomRenderer = {
  match: (fieldSchema: Schema) => boolean;
  Component: FieldComponent;
};

/**
 * An individual form control (excluding label, error message, etc.)
 */
type CustomControl = {
  match: (fieldSchema: Schema) => boolean;
  Component: FieldComponent;
};

export interface IRenderContext {
  customRenderers: CustomRenderer[];
  customControls: CustomControl[];
}

export const RendererContext = createContext<IRenderContext>({
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

const OUTPUT_KEY_SCHEMA: Schema = {
  type: "string",
  description: "A key to refer to this brick in subsequent bricks",
};

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

        // Fine because coming from Object.entries for the schema
        // eslint-disable-next-line security/detect-object-injection
        const propUiSchema = uiSchema?.[prop];
        return (
          <FieldRenderer
            key={prop}
            name={compact([name, configKey, prop]).join(".")}
            schema={fieldSchema}
            uiSchema={propUiSchema}
          />
        );
      })}
      {showOutputKey && (
        <FieldRenderer
          name={`${name}.outputKey`}
          label="Output Variable"
          schema={OUTPUT_KEY_SCHEMA}
        />
      )}
      {isEmpty(schema) && <div>No options available</div>}
    </>
  );

  element.displayName = "Options Field";
  return element;
}

export default genericOptionsFactory;
