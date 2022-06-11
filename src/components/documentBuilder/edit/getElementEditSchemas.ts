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

import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { joinName } from "@/utils";
import { DocumentElementType } from "@/components/documentBuilder/documentBuilderTypes";

export function getClassNameEdit(elementName: string): SchemaFieldProps {
  return {
    name: joinName(elementName, "config", "className"),
    schema: { type: "string", format: "bootstrap-class" },
    label: "CSS Class",
  };
}

function getElementEditSchemas(
  elementType: DocumentElementType,
  elementName: string
): SchemaFieldProps[] {
  switch (elementType) {
    case "header_1":
    case "header_2":
    case "header_3": {
      const titleEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "title"),
        schema: { type: "string" },
        label: "Title",
      };
      return [titleEdit, getClassNameEdit(elementName)];
    }

    case "text": {
      const textEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "text"),
        schema: { type: "string" },
        label: "Text",
      };
      return [textEdit, getClassNameEdit(elementName)];
    }

    case "card": {
      const headingEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "heading"),
        schema: { type: "string" },
        label: "Heading",
      };
      return [headingEdit, getClassNameEdit(elementName)];
    }

    case "pipeline": {
      throw new Error("Use custom Options for pipeline element.");
    }

    case "button": {
      const titleEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "title"),
        schema: { type: "string" },
        label: "Title",
      };
      const variantEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "variant"),
        schema: {
          type: "string",
          enum: [
            "primary",
            "secondary",
            "success",
            "warning",
            "danger",
            "info",
            "light",
            "dark",
            "link",
            "outline-primary",
            "outline-secondary",
            "outline-success",
            "outline-warning",
            "outline-danger",
            "outline-info",
            "outline-light",
            "outline-dark",
            "outline-link",
          ],
        },
        label: "Variant",
      };
      const sizeEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "size"),
        schema: { type: "string", enum: ["lg", "md", "sm"] },
        label: "Size",
      };
      const disabledEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "disabled"),
        schema: { type: "boolean" },
        label: "Disabled",
      };
      return [
        titleEdit,
        variantEdit,
        sizeEdit,
        disabledEdit,
        getClassNameEdit(elementName),
      ];
    }

    case "list": {
      throw new Error("Use custom Options for list element.");
    }

    default: {
      return [getClassNameEdit(elementName)];
    }
  }
}

export default getElementEditSchemas;
