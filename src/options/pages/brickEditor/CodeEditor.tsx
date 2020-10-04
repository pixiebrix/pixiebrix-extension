import AceEditor from "react-ace";
import ListGroup from "react-bootstrap/ListGroup";
import castArray from "lodash/castArray";
import Card from "react-bootstrap/Card";
import Select from "react-select";
import React, { useState } from "react";
import { useField } from "formik";

import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/theme-chrome";

// https://webpack.js.org/loaders/raw-loader/#examples
const serviceTemplate = require("raw-loader!@contrib/templates/service.txt?esModule=false")
  .default;
const emberjsTemplate = require("raw-loader!@contrib/templates/reader-emberjs.txt?esModule=false")
  .default;
const jqueryTemplate = require("raw-loader!@contrib/templates/reader-jquery.txt?esModule=false")
  .default;
const reactTemplate = require("raw-loader!@contrib/templates/reader-react.txt?esModule=false")
  .default;

interface TemplateOption {
  value: string;
  label: string;
  template: unknown;
}

const templateOptions: TemplateOption[] = [
  { value: "service", label: "Service", template: serviceTemplate },
  {
    value: "reader-emberjs",
    label: "Reader - Ember.js",
    template: emberjsTemplate,
  },
  {
    value: "reader-jquery",
    label: "Reader - JQuery",
    template: jqueryTemplate,
  },
  { value: "reader-react", label: "Reader - React", template: reactTemplate },
];

interface OwnProps {
  name: string;
  width: number | undefined;
  showTemplates?: boolean;
}

const CodeEditor: React.FunctionComponent<OwnProps> = ({
  name,
  width,
  showTemplates,
}) => {
  const [template, setTemplate] = useState<TemplateOption>();
  const [field, meta, { setValue }] = useField<string>(name);

  return (
    <>
      <AceEditor
        value={field.value}
        onChange={setValue}
        width={(width ?? 400).toString()}
        mode="yaml"
        theme="chrome"
        name="UNIQUE_ID_OF_DIV"
        editorProps={{ $blockScrolling: true }}
      />
      {meta.error && (
        <ListGroup>
          {castArray(meta.error).map((x) => (
            <ListGroup.Item
              key={x as string}
              className="text-danger"
              style={{ borderRadius: 0 }}
            >
              {x}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      <Card.Footer>
        {showTemplates && (
          <div className="d-flex align-items-center">
            <div style={{ width: 300 }}>
              <Select
                options={templateOptions}
                value={template}
                onChange={(x: any) => {
                  setValue(x.template);
                  setTemplate(x);
                }}
                placeholder="Load a template"
              />
            </div>
          </div>
        )}
      </Card.Footer>
    </>
  );
};

export default CodeEditor;
