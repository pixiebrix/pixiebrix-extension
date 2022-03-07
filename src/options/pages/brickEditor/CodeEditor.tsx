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

import { castArray, trim, noop, isEmpty } from "lodash";
import { ListGroup } from "react-bootstrap";
import React, { useRef, Suspense, useEffect } from "react";
import { useField, useFormikContext } from "formik";

import AceEditor from "@/vendors/AceEditor";

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
  openDefinition = noop,
  openEditor = noop,
}) => {
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
              name: "save", // Name for the key binding.
              bindKey: { win: "Ctrl-S", mac: "Command-S" }, // Key combination used for the command.
              exec() {
                void submitForm();
              },
            },
            {
              name: "openEditor",
              bindKey: { win: "Ctrl-O", mac: "Command-O" },
              exec(editor) {
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
              exec(editor) {
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
            {castArray(meta.error).map((error) => (
              <ListGroup.Item
                key={error}
                className="text-danger"
                style={{ borderRadius: 0 }}
              >
                {error}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Suspense>
    </>
  );
};

export default CodeEditor;
