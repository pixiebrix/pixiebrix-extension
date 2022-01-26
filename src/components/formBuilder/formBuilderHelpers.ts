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

import {
  KEYS_OF_UI_SCHEMA,
  SafeString,
  Schema,
  SchemaPropertyType,
  UiSchema,
} from "@/core";
import { RJSFSchema, SelectStringOption } from "./formBuilderTypes";
import { UI_ORDER, UI_WIDGET } from "./schemaFieldNames";
import { freshIdentifier } from "@/utils";
import { produce } from "immer";

export const MINIMAL_SCHEMA: Schema = {
  type: "object",
};

export const MINIMAL_UI_SCHEMA: UiSchema = {
  [UI_ORDER]: ["*"],
};

export const DEFAULT_FIELD_TYPE = "string";

export type UiType = {
  propertyType: SchemaPropertyType;
  uiWidget: string | undefined;
  propertyFormat: string | undefined;
};

export const parseUiType = (value: string): UiType => {
  const [propertyType, uiWidget, propertyFormat] = value.split(":");
  return {
    propertyType: propertyType as SchemaPropertyType,
    uiWidget: uiWidget === "" ? undefined : uiWidget,
    propertyFormat: propertyFormat === "" ? undefined : propertyFormat,
  };
};

export const stringifyUiType = ({
  propertyType,
  uiWidget,
  propertyFormat,
}: {
  propertyType: SchemaPropertyType;
  uiWidget?: string;
  propertyFormat?: string;
}) => `${propertyType}:${uiWidget ?? ""}:${propertyFormat ?? ""}`;

export const FIELD_TYPE_OPTIONS: SelectStringOption[] = [
  {
    label: "Single line text",
    value: stringifyUiType({ propertyType: "string" }),
  },
  {
    label: "Paragraph text",
    value: stringifyUiType({ propertyType: "string", uiWidget: "textarea" }),
  },
  {
    label: "Email",
    value: stringifyUiType({ propertyType: "string", propertyFormat: "email" }),
  },
  {
    label: "Website",
    value: stringifyUiType({ propertyType: "string", propertyFormat: "uri" }),
  },
  {
    label: "File",
    value: stringifyUiType({
      propertyType: "string",
      propertyFormat: "data-url",
    }),
  },
  {
    label: "Date",
    value: stringifyUiType({ propertyType: "string", propertyFormat: "date" }),
  },
  {
    label: "Date and time",
    value: stringifyUiType({
      propertyType: "string",
      propertyFormat: "date-time",
    }),
  },
  {
    label: "Number",
    value: stringifyUiType({ propertyType: "number" }),
  },
  {
    label: "Dropdown",
    value: stringifyUiType({ propertyType: "string", uiWidget: "select" }),
  },
  {
    label: "Checkbox",
    value: stringifyUiType({ propertyType: "boolean" }),
  },
  {
    label: "Image crop",
    value: stringifyUiType({
      propertyType: "string",
      uiWidget: "imageCrop",
    }),
  },
];

export const FIELD_TYPES_WITHOUT_DEFAULT = [
  stringifyUiType({
    propertyType: "string",
    propertyFormat: "data-url",
  }),
  stringifyUiType({
    propertyType: "string",
    uiWidget: "imageCrop",
  }),
];

/**
 * Finds a string in an array, if found removes it from the array and, if necessary, inserts new elements in its place.
 * Does not mutate the source array.
 * @param array The source array.
 * @param stringToBeReplaced The string item to look for and remove.
 * @param items Elements to insert into the array in place of the deleted element.
 * @returns An array having the specified element removed or replaced for the new items.
 */
export const replaceStringInArray = (
  array: string[],
  stringToBeReplaced: string,
  ...items: string[]
) => {
  const copy = [...array];
  const index = copy.indexOf(stringToBeReplaced);
  if (index === -1) {
    return copy;
  }

  copy.splice(index, 1, ...items);

  return copy;
};

export const generateNewPropertyName = (existingProperties: string[]) =>
  freshIdentifier("field" as SafeString, existingProperties, {
    includeFirstNumber: true,
  });

export const moveStringInArray = (
  array: string[],
  stringToBeMoved: string,
  direction: "up" | "down"
) => {
  const copy = [...array];
  const fromIndex = copy.indexOf(stringToBeMoved);
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  // eslint-disable-next-line security/detect-object-injection
  [copy[fromIndex], copy[toIndex]] = [copy[toIndex], copy[fromIndex]];
  return copy;
};

export const validateNextPropertyName = (
  schema: Schema,
  propertyName: string,
  nextPropertyName: string
) => {
  if (nextPropertyName === propertyName) {
    return null;
  }

  if (nextPropertyName === "") {
    return "Name cannot be empty.";
  }

  if (nextPropertyName.includes(".")) {
    return "Name must not contain periods.";
  }

  if (
    schema.properties &&
    Object.prototype.hasOwnProperty.call(schema.properties, nextPropertyName)
  ) {
    return `Name must be unique. Another property "${
      // eslint-disable-next-line security/detect-object-injection -- checked with hasOwnProperty
      (schema.properties[nextPropertyName] as Schema).title
    }" already has the name "${nextPropertyName}".`;
  }

  if (
    // Checked Own Properties already.
    // If the property with nextPropertyName is defined nevertheless, there's something wrong with the new name.
    typeof (schema.properties ?? {})[String(nextPropertyName)] !==
      "undefined" ||
    // Will break the UI Schema
    KEYS_OF_UI_SCHEMA.includes(nextPropertyName)
  ) {
    return "Such property name is forbidden.";
  }

  return null;
};

export const produceSchemaOnPropertyNameChange = (
  rjsfSchema: RJSFSchema,
  propertyName: string,
  nextPropertyName: string
) =>
  produce(rjsfSchema, (draft) => {
    // Relying on Immer to protect against object injections
    /* eslint-disable @typescript-eslint/no-dynamic-delete, security/detect-object-injection */
    draft.schema.properties[nextPropertyName] =
      draft.schema.properties[propertyName];
    delete draft.schema.properties[propertyName];

    if (draft.schema.required?.includes(propertyName)) {
      draft.schema.required = replaceStringInArray(
        draft.schema.required,
        propertyName,
        nextPropertyName
      );
    }

    const nextUiOrder = replaceStringInArray(
      draft.uiSchema[UI_ORDER],
      propertyName,
      nextPropertyName
    );
    draft.uiSchema[UI_ORDER] = nextUiOrder;

    if (draft.uiSchema[propertyName]) {
      draft.uiSchema[nextPropertyName] = draft.uiSchema[propertyName];
      delete draft.uiSchema[propertyName];
    }
    /* eslint-enable @typescript-eslint/no-dynamic-delete, security/detect-object-injection */
  });

export const produceSchemaOnUiTypeChange = (
  rjsfSchema: RJSFSchema,
  propertyName: string,
  nextUiType: string
) => {
  const { propertyType, uiWidget, propertyFormat } = parseUiType(nextUiType);

  return produce(rjsfSchema, (draft) => {
    // Relying on Immer to protect against object injections
    /* eslint-disable @typescript-eslint/no-dynamic-delete, security/detect-object-injection */
    const draftPropertySchema = draft.schema.properties[propertyName] as Schema;
    draftPropertySchema.type = propertyType;

    if (propertyFormat) {
      draftPropertySchema.format = propertyFormat;
    } else {
      delete draftPropertySchema.format;
    }

    const propertySchema = rjsfSchema.schema.properties[propertyName] as Schema;
    if (
      propertySchema.type !== propertyType ||
      propertySchema.format !== propertyFormat
    ) {
      delete draftPropertySchema.default;
    }

    if (uiWidget) {
      if (!draft.uiSchema[propertyName]) {
        draft.uiSchema[propertyName] = {};
      }

      draft.uiSchema[propertyName][UI_WIDGET] = uiWidget;
    } else if (draft.uiSchema[propertyName]) {
      delete draft.uiSchema[propertyName][UI_WIDGET];
    }

    if (uiWidget === "select") {
      draftPropertySchema.enum = [];
    } else {
      delete draftPropertySchema.enum;
    }
    /* eslint-enable @typescript-eslint/no-dynamic-delete, security/detect-object-injection */
  });
};

export const updateRjsfSchemaWithDefaultsIfNeeded = (
  rjsfSchema: RJSFSchema = {} as RJSFSchema
) => {
  const { schema, uiSchema } = rjsfSchema;

  // eslint-disable-next-line security/detect-object-injection -- UI_ORDER is a known property
  const uiOrder = uiSchema?.[UI_ORDER];
  const needToUpdateRequired =
    Boolean(schema) &&
    typeof schema.required !== "undefined" &&
    !Array.isArray(schema.required);

  if (!schema || !uiSchema || !uiOrder?.includes("*") || needToUpdateRequired) {
    return produce(rjsfSchema, (draft) => {
      if (!draft.schema) {
        draft.schema = MINIMAL_SCHEMA;
      }

      if (!draft.uiSchema) {
        draft.uiSchema = MINIMAL_UI_SCHEMA;
      }

      // Relying on Immer to protect against object injections
      /* eslint-disable security/detect-object-injection */
      if (!draft.uiSchema[UI_ORDER]) {
        const propertyKeys = Object.keys(draft.schema.properties || {});
        draft.uiSchema[UI_ORDER] = [...propertyKeys, "*"];
      } else if (!draft.uiSchema[UI_ORDER].includes("*")) {
        draft.uiSchema[UI_ORDER].push("*");
      }
      /* eslint-enable security/detect-object-injection */

      if (needToUpdateRequired) {
        draft.schema.required = [];
      }
    });
  }

  return null;
};

export const normalizeUiOrder = (propertyKeys: string[], uiOrder: string[]) => {
  // A naive check to see if all property keys are presenter in uiOrder
  if (
    propertyKeys.length === uiOrder.length - 1 &&
    uiOrder[uiOrder.length - 1] === "*"
  ) {
    return uiOrder;
  }

  return [
    ...uiOrder.filter((key) => propertyKeys.includes(key)),
    ...propertyKeys.filter((key) => !uiOrder.includes(key)),
    "*",
  ];
};
