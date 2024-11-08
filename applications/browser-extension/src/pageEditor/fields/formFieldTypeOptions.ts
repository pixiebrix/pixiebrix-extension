import { type SelectStringOption } from "../../components/formBuilder/formBuilderTypes";
import { stringifyUiType } from "../../components/formBuilder/formBuilderHelpers";

const FORM_FIELD_TYPE_OPTIONS: SelectStringOption[] = [
  {
    label: "Single line text",
    value: stringifyUiType({ propertyType: "string" }),
  },
  {
    label: "Paragraph text",
    value: stringifyUiType({ propertyType: "string", uiWidget: "textarea" }),
  },
  {
    label: "Rich text",
    value: stringifyUiType({
      propertyType: "string",
      uiWidget: "richText",
      propertyFormat: "html",
    }),
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
    label: "Dropdown with labels",
    value: stringifyUiType({
      propertyType: "string",
      uiWidget: "select",
      extra: "selectWithLabels",
    }),
  },
  {
    label: "Checkbox",
    value: stringifyUiType({ propertyType: "boolean" }),
  },
  {
    label: "Checkboxes (multi-select)",
    value: stringifyUiType({
      propertyType: "array",
      uiWidget: "checkboxes",
    }),
  },
  {
    label: "Image crop",
    value: stringifyUiType({
      propertyType: "string",
      uiWidget: "imageCrop",
    }),
  },
];

export default FORM_FIELD_TYPE_OPTIONS;
