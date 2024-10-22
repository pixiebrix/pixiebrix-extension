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

import { type RJSFSchema } from "../formBuilderTypes";
import {
  minimalSchemaFactory,
  minimalUiSchemaFactory,
} from "@/utils/schemaUtils";

export const initOneFieldSchemaCase: (fieldName: string) => RJSFSchema = (
  fieldName = "firstName",
) =>
  ({
    schema: {
      title: "A form",
      type: "object",
      properties: {
        [fieldName]: {
          type: "string",
          title: "First name",
        },
      },
    },
    uiSchema: minimalUiSchemaFactory(),
  }) as RJSFSchema;

export const initAddingFieldCases: () => Array<
  [string | null, RJSFSchema, RJSFSchema]
> = () => [
  [
    null,
    {
      schema: minimalSchemaFactory(),
      uiSchema: minimalUiSchemaFactory(),
    },
    {
      schema: {
        type: "object",
        properties: {
          field1: {
            title: "field1",
            type: "string",
          },
        },
      },
      uiSchema: {
        "ui:order": ["field1", "*"],
      },
    },
  ],
  [
    "field1",
    {
      schema: {
        type: "object",
        required: ["field1"],
        properties: {
          field1: {
            title: "field1",
            type: "string",
          },
        },
      },
      uiSchema: {
        "ui:order": ["field1", "*"],
      },
    },
    {
      schema: {
        type: "object",
        required: ["field1"],
        properties: {
          field1: {
            title: "field1",
            type: "string",
          },
          field2: {
            title: "field2",
            type: "string",
          },
        },
      },
      uiSchema: {
        "ui:order": ["field1", "field2", "*"],
      },
    },
  ],
];

export const initRenamingCases = () => {
  const fieldName = "fieldToBeRenamed";
  const newFieldName = "newFieldName";

  const renamingCases: RJSFSchema[][] = [
    // Renaming a required field
    [
      {
        schema: {
          title: "A form",
          type: "object",
          required: [fieldName],
          properties: {
            [fieldName]: {
              type: "string",
              title: "First name",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [fieldName, "*"],
        },
      },
      {
        schema: {
          title: "A form",
          type: "object",
          required: [newFieldName],
          properties: {
            [newFieldName]: {
              type: "string",
              title: "First name",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [newFieldName, "*"],
        },
      },
    ],

    // Simple text field
    [
      {
        schema: {
          title: "A form",
          type: "object",
          properties: {
            [fieldName]: {
              type: "string",
              title: "First name",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [fieldName, "*"],
        },
      },
      {
        schema: {
          title: "A form",
          type: "object",
          properties: {
            [newFieldName]: {
              type: "string",
              title: "First name",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [newFieldName, "*"],
        },
      },
    ],

    // Date field
    [
      {
        schema: {
          title: "A form",
          type: "object",
          properties: {
            [fieldName]: {
              type: "string",
              title: "First name",
              format: "date",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [fieldName, "*"],
        },
      },
      {
        schema: {
          title: "A form",
          type: "object",
          properties: {
            [newFieldName]: {
              type: "string",
              title: "First name",
              format: "date",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [newFieldName, "*"],
        },
      },
    ],

    // Renaming text area
    [
      {
        schema: {
          title: "A form",
          type: "object",
          properties: {
            [fieldName]: {
              type: "string",
              title: "First name",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [fieldName, "*"],
          [fieldName]: {
            "ui:options": {
              submitOnEnter: false,
              submitToolbar: { show: false },
            },
            "ui:widget": "textarea",
          },
        },
      },
      {
        schema: {
          title: "A form",
          type: "object",
          properties: {
            [newFieldName]: {
              type: "string",
              title: "First name",
            },
            anotherFieldName: {
              type: "string",
              title: "Another field name",
            },
          },
        },
        uiSchema: {
          "ui:order": [newFieldName, "*"],
          [newFieldName]: {
            "ui:options": {
              submitOnEnter: false,
              submitToolbar: {
                show: false,
              },
            },
            "ui:widget": "textarea",
          },
        },
      },
    ],
  ];

  return renamingCases;
};
