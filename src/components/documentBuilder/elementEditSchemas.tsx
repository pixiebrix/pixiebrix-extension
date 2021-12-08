import {
  DocumentElement,
  PipelineDocumentElement,
} from "./documentBuilderTypes";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { joinName } from "@/utils";

function getClassNameEdit(elementName: string): SchemaFieldProps {
  return {
    name: joinName(elementName, "config", "className"),
    schema: { type: "string" },
    label: "CSS Class",
  };
}

export function getElementEditSchemas(
  element: DocumentElement,
  elementName: string
): SchemaFieldProps[] {
  switch (element.type) {
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
      return [];
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
      return [titleEdit, variantEdit, sizeEdit, getClassNameEdit(elementName)];
    }

    case "list": {
      const arraySourceEdit: SchemaFieldProps = {
        name: joinName(elementName, "config", "array"),
        schema: { type: "array" },
        label: "Array",
      };

      return [arraySourceEdit];
    }

    default:
      return [getClassNameEdit(elementName)];
  }
}
