/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { castArray, trim, noop, isEmpty } from "lodash";
import { Card, ListGroup } from "react-bootstrap";
import Select from "react-select";
import React, { useState, useRef, Suspense, useEffect } from "react";
import { useField, useFormikContext } from "formik";

import serviceTemplate from "@contrib/templates/service.txt";
import emberjsTemplate from "@contrib/templates/reader-emberjs.txt";
import jqueryTemplate from "@contrib/templates/reader-jquery.txt";
import reactTemplate from "@contrib/templates/reader-react.txt";
import menuTemplate from "@contrib/templates/foundation-menu-item.txt";
import panelTemplate from "@contrib/templates/foundation-panel.txt";
import blueprintTemplate from "@contrib/templates/blueprint-menu.txt";

const AceEditor = React.lazy(
  () =>
    import(
      /* webpackChunkName: "ace-editor" */
      "@/vendors/AceEditor"
    )
);

interface TemplateOption {
  value: string;
  label: string;
  template: unknown;
}

const templateOptions: TemplateOption[] = [
  {
    value: "foundation-menu-item",
    label: "Foundation - Menu Item",
    template: menuTemplate,
  },
  {
    value: "foundation-panel",
    label: "Foundation - Panel",
    template: panelTemplate,
  },
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
  {
    value: "blueprint-menu",
    label: "Blueprint - Menu Item",
    template: blueprintTemplate,
  },
];

interface OwnProps {
  name: string;
  width: number | undefined;
  showTemplates?: boolean;
  openDefinition?: (id: string) => void;
  openEditor?: (id: string) => void;
}

const CodeEditor: React.FunctionComponent<OwnProps> = ({
  name,
  width,
  showTemplates,
  openDefinition = noop,
  openEditor = noop,
}) => {
  const [template, setTemplate] = useState<TemplateOption>();
  const [field, meta, { setValue }] = useField<string>(name);
  const { submitForm } = useFormikContext();

  // Have to use useRef because AceEditor only binds on mount
  // https://github.com/securingsincity/react-ace/issues/684
  const openDefinitionRef = useRef(openDefinition);
  useEffect(() => {
    openDefinitionRef.current = openDefinition;
  }, [openDefinition]);

  // Have to use useRef because AceEditor only binds on mount
  // https://github.com/securingsincity/react-ace/issues/684
  const openEditorRef = useRef(openEditor);
  useEffect(() => {
    openEditorRef.current = openEditor;
  }, [openEditor]);

  return (
    <>
      <Suspense fallback={<div>Loading editor...</div>}>
        <AceEditor
          value={field.value}
          onChange={setValue}
          width={(width ?? 400).toString()}
          mode="yaml"
          theme="chrome"
          name="ACE_EDITOR_DIV"
          editorProps={{ $blockScrolling: true }}
          commands={[
            {
              name: "save", //name for the key binding.
              bindKey: { win: "Ctrl-S", mac: "Command-S" }, //key combination used for the command.
              exec: () => {
                void submitForm();
              },
            },
            {
              name: "openEditor",
              bindKey: { win: "Ctrl-O", mac: "Command-O" },
              exec: (editor) => {
                const { row, column } = editor.getCursorPosition();
                const id = trim(
                  editor.session.getTokenAt(row, column).value,
                  "'\" \t"
                );
                if (!isEmpty(id)) {
                  openEditorRef.current(id);
                }
              },
            },
            {
              name: "openDefinition",
              bindKey: { win: "Ctrl-B", mac: "Command-B" },
              exec: (editor) => {
                const { row, column } = editor.getCursorPosition();
                const id = trim(
                  editor.session.getTokenAt(row, column).value,
                  "'\" \t"
                );
                if (!isEmpty(id)) {
                  openDefinitionRef.current(id);
                }
              },
            },
          ]}
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
      </Suspense>
    </>
  );
};

export default CodeEditor;
