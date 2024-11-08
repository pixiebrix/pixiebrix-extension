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

import { type SchemaFieldProps } from "../../../components/fields/schemaFields/propTypes";
import { type DocumentBuilderElementType } from "../documentBuilderTypes";
import React from "react";
import { VALID_HEADER_TAGS } from "../allowedElementTypes";
import { joinName } from "../../../utils/formUtils";
import { type UiSchema } from "../../../types/schemaTypes";

function getClassNameEdit(
  elementName: string,
  {
    label = "Layout/Style",
    uiSchema,
  }: { label?: string; uiSchema?: UiSchema } = {},
): SchemaFieldProps {
  return {
    name: joinName(elementName, "config", "className"),
    schema: { type: "string", format: "bootstrap-class" },
    label,
    uiSchema,
  };
}

function getHiddenEdit(elementName: string): SchemaFieldProps {
  return {
    name: joinName(elementName, "config", "hidden"),
    // Allow any to permit truthy values like for other conditional fields
    schema: { type: ["string", "boolean", "null", "number"] },
    label: "Hidden",
    description: (
      <p>
        Condition determining whether to hide the element. Truthy string values
        are&nbsp;
        <code>true</code>, <code>t</code>, <code>yes</code>, <code>y</code>,{" "}
        <code>on</code>, and <code>1</code> (case-insensitive)
      </p>
    ),
  };
}

function getElementEditSchemas(
  documentBuilderElementType: DocumentBuilderElementType,
  elementName: string,
): SchemaFieldProps[] {
  switch (documentBuilderElementType) {
    // Provide backwards compatibility for old elements
    case "header_1":
    case "header_2":
    case "header_3": {
      const titleEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "title"),
        schema: { type: "string" },
        label: "Title",
      };
      return [
        titleEdit,
        getHiddenEdit(elementName),
        getClassNameEdit(elementName),
      ];
    }

    case "header": {
      const titleEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "title"),
        schema: { type: "string" },
        label: "Title",
      };
      const heading: SchemaFieldProps = {
        name: joinName(elementName, "config", "heading"),
        schema: {
          type: "string",
          enum: VALID_HEADER_TAGS,
          format: "heading-style",
        },
        label: "Heading",
        isRequired: true,
      };
      return [
        titleEdit,
        heading,
        getHiddenEdit(elementName),
        getClassNameEdit(elementName),
      ];
    }

    case "text": {
      const textEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "text"),
        schema: { type: "string" },
        label: "Text",
      };
      const enableMarkdown: SchemaFieldProps = {
        name: joinName(elementName, "config", "enableMarkdown"),
        schema: { type: "boolean" },
        label: "Enable markdown",
        isRequired: true,
      };
      return [
        textEdit,
        enableMarkdown,
        getHiddenEdit(elementName),
        getClassNameEdit(elementName),
      ];
    }

    case "image": {
      const imageUrl: SchemaFieldProps = {
        name: joinName(elementName, "config", "url"),
        schema: { type: "string", format: "uri" },
        label: "Image URL",
      };
      const height: SchemaFieldProps = {
        name: joinName(elementName, "config", "height"),
        schema: { type: ["string", "number"] },
        label: "Height",
      };
      const width: SchemaFieldProps = {
        name: joinName(elementName, "config", "width"),
        schema: { type: ["string", "number"] },
        label: "Width",
      };
      return [
        imageUrl,
        height,
        width,
        getHiddenEdit(elementName),
        getClassNameEdit(elementName),
      ];
    }

    case "card": {
      const headingEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "heading"),
        schema: { type: "string" },
        label: "Heading",
      };
      return [
        headingEdit,
        getHiddenEdit(elementName),
        getClassNameEdit(elementName),
      ];
    }

    case "pipeline": {
      throw new Error("Use custom Options for pipeline element.");
    }

    case "button": {
      const titleEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "title"),
        schema: { type: "string" },
        label: "Button Label",
        description: "The text to display on the button",
      };
      const tooltipEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "tooltip"),
        schema: { type: "string" },
        label: "Button Tooltip",
        description:
          "Additional text to display over the button on hover, usually used to provide additional context about the button",
      };
      const iconEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "icon"),
        schema: { $ref: "https://app.pixiebrix.com/schemas/icon#" },
        label: "Button Icon",
        description: "The icon to display on the button before the label",
        uiSchema: {
          "ui:widget": "IconWidget",
        },
      };
      const variantEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "variant"),
        schema: {
          type: "string",
          oneOf: [
            { const: "primary", title: "Primary" },
            { const: "outline-primary", title: "Primary" },
            { const: "secondary", title: "Secondary" },
            { const: "outline-secondary", title: "Secondary" },
            { const: "success", title: "Success" },
            { const: "outline-success", title: "Success" },
            { const: "warning", title: "Warning" },
            { const: "outline-warning", title: "Warning" },
            { const: "danger", title: "Danger" },
            { const: "outline-danger", title: "Danger" },
            { const: "info", title: "Info" },
            { const: "outline-info", title: "Info" },
            { const: "light", title: "Light" },
            { const: "outline-light", title: "Light" },
            { const: "dark", title: "Dark" },
            { const: "outline-dark", title: "Dark" },
            { const: "link", title: "Link" },
            { const: "outline-link", title: "Link" },
          ],
        },
        uiSchema: {
          "ui:widget": "SchemaButtonVariantWidget",
        },
        label: "Button Style",
        description: "The style/variant of the button",
      };
      const sizeEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "size"),
        schema: {
          type: "string",
          oneOf: [
            { const: "md", title: "Medium" },
            { const: "lg", title: "Large" },
            { const: "sm", title: "Small" },
          ],
        },
        uiSchema: {
          options: {
            props: {
              // Disabled clearable because the button will have a default size whether a user selects one or not
              isClearable: false,
              // Default searchable to false because it seems silly to allow search across 3 options
              isSearchable: false,
            },
          },
        },
        label: "Button Size",
        description: "The size of the button: Small, Medium, or Large",
      };
      const fullWidthEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "fullWidth"),
        schema: { type: "boolean" },
        label: "Full Width",
        description:
          "Toggle on to expand the button to fit the width of the column",
      };
      const disabledEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "disabled"),
        // Allow any to permit truthy values like for other conditional fields
        schema: { type: ["string", "boolean", "null", "number"] },
        label: "Disabled",
        description: (
          <div>
            Condition determining whether to disable the button. Truthy string
            values are&nbsp;
            <code>true</code>, <code>t</code>, <code>yes</code>, <code>y</code>,{" "}
            <code>on</code>, and <code>1</code> (case-insensitive)
          </div>
        ),
      };
      return [
        titleEdit,
        iconEdit,
        tooltipEdit,
        variantEdit,
        sizeEdit,
        fullWidthEdit,
        disabledEdit,
        getHiddenEdit(elementName),
        getClassNameEdit(elementName, {
          label: "Label Style",
          uiSchema: {
            "ui:options": {
              textVariant: false,
              backgroundColor: false,
              borders: false,
            },
          },
        }),
      ];
    }

    case "list": {
      throw new Error("Use custom Options for list element.");
    }

    default: {
      return [getHiddenEdit(elementName), getClassNameEdit(elementName)];
    }
  }
}

export default getElementEditSchemas;
