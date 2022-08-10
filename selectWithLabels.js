const works1 = {
  schema: {
    oneOf: { __type__: "var", __value__: "@data" },
    title: { __type__: "nunjucks", __value__: "Dropdown with labels" },
    type: "string",
  },
  uiSchema: {
    "ui:widget": "select",
  },
};

const doesntWorks1 = {
  schema: {
    oneOf: { __type__: "var", __value__: "" },
    title: { __type__: "nunjucks", __value__: "Dropdown with labels" },
    type: "string",
  },
  uiSchema: {
    "ui:widget": "select",
  },
};
