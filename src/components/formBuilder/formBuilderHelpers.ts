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

import { SafeString, Schema, SchemaPropertyType, UiSchema } from "@/core";
import { RJSFSchema, SelectStringOption } from "./formBuilderTypes";
import { UI_ORDER, UI_WIDGET } from "./schemaFieldNames";
import { freshIdentifier } from "@/utils";
import produce from "immer";

export const MINIMAL_SCHEMA: Schema = {
  type: "object",
};

export const MINIMAL_UI_SCHEMA: UiSchema = {
  [UI_ORDER]: ["*"],
};

export const DEFAULT_FIELD_TYPE = "string";

export const parseUiType = (value: string) => {
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
];

export const FIELD_TYPES_WITHOUT_DEFAULT = [
  stringifyUiType({
    propertyType: "string",
    propertyFormat: "data-url",
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
  const arr = [...array];
  const index = arr.indexOf(stringToBeReplaced);
  if (index === -1) {
    return arr;
  }

  arr.splice(index, 1, ...items);

  return arr;
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
  const arr = [...array];
  const fromIndex = arr.indexOf(stringToBeMoved);
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
  // eslint-disable-next-line security/detect-object-injection
  [arr[fromIndex], arr[toIndex]] = [arr[toIndex], arr[fromIndex]];
  return arr;
};

export const validateNextPropertyName = (
  schema: Schema,
  propertyName: string,
  nextPropertyName: string
) => {
  let error: string = null;

  if (nextPropertyName !== propertyName) {
    if (nextPropertyName === "") {
      error = "Name cannot be empty.";
    }

    if (nextPropertyName.includes(".")) {
      error = "Name must not contain periods.";
    }

    const existingProperties = Object.keys(schema.properties);
    if (existingProperties.includes(nextPropertyName)) {
      error = `Name must be unique. Another property "${
        // eslint-disable-next-line security/detect-object-injection
        (schema.properties[nextPropertyName] as Schema).title
      }" already has the name "${nextPropertyName}".`;
    }
  }

  return error;
};

export const produceSchemaOnPropertyNameChange = (
  rjsfSchema: RJSFSchema,
  propertyName: string,
  nextPropertyName: string
) =>
  produce(rjsfSchema, (draft) => {
    // eslint-disable-next-line security/detect-object-injection
    draft.schema.properties[nextPropertyName] =
      // eslint-disable-next-line security/detect-object-injection
      draft.schema.properties[propertyName];
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete,  security/detect-object-injection
    delete draft.schema.properties[propertyName];

    if (draft.schema.required?.includes(propertyName)) {
      draft.schema.required = replaceStringInArray(
        draft.schema.required,
        propertyName,
        nextPropertyName
      );
    }

    const nextUiOrder = replaceStringInArray(
      // eslint-disable-next-line security/detect-object-injection
      draft.uiSchema[UI_ORDER],
      propertyName,
      nextPropertyName
    );
    // eslint-disable-next-line security/detect-object-injection
    draft.uiSchema[UI_ORDER] = nextUiOrder;
  });

export const produceSchemaOnUiTypeChange = (
  rjsfSchema: RJSFSchema,
  propertyName: string,
  nextUiType: string
) => {
  const { propertyType, uiWidget, propertyFormat } = parseUiType(nextUiType);

  return produce(rjsfSchema, (draft) => {
    // eslint-disable-next-line security/detect-object-injection
    const draftPropertySchema = draft.schema.properties[propertyName] as Schema;
    draftPropertySchema.type = propertyType;

    if (propertyFormat) {
      draftPropertySchema.format = propertyFormat;
    } else {
      delete draftPropertySchema.format;
    }

    // eslint-disable-next-line security/detect-object-injection
    const propertySchema = rjsfSchema.schema.properties[propertyName] as Schema;
    if (
      propertySchema.type !== propertyType ||
      propertySchema.format !== propertyFormat
    ) {
      delete draftPropertySchema.default;
    }

    if (uiWidget) {
      // eslint-disable-next-line security/detect-object-injection
      if (!draft.uiSchema[propertyName]) {
        // eslint-disable-next-line security/detect-object-injection
        draft.uiSchema[propertyName] = {};
      }

      // eslint-disable-next-line security/detect-object-injection
      draft.uiSchema[propertyName][UI_WIDGET] = uiWidget;
      // eslint-disable-next-line security/detect-object-injection
    } else if (draft.uiSchema[propertyName]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, security/detect-object-injection
      delete draft.uiSchema[propertyName][UI_WIDGET];
    }

    if (uiWidget === "select") {
      draftPropertySchema.enum = [];
    } else {
      delete draftPropertySchema.enum;
    }
  });
};
