import { type RJSFSchema } from "./formBuilderTypes";
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
  [string, RJSFSchema, RJSFSchema]
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
              submitToolbar: false,
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
