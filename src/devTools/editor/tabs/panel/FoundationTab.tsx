/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback, useMemo, useRef } from "react";
import { Field, FieldInputProps, useField, useFormikContext } from "formik";
import { Alert, Col, Form, Row, Tab } from "react-bootstrap";
import SelectorSelectorField from "@/devTools/editor/fields/SelectorSelectorField";
import { FormState } from "@/devTools/editor/editorSlice";

const FoundationTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
}> = ({ eventKey = "foundation", editable }) => {
  const [field] = useField("containerInfo");

  const templateInput = useRef<HTMLTextAreaElement>(null);
  const { values } = useFormikContext<FormState>();

  const locked = useMemo(
    () => values.installed && !editable?.has(values.extensionPoint.metadata.id),
    [editable, values.installed, values.extensionPoint.metadata.id]
  );

  const insertSnippet = useCallback(
    (snippet: string) => {
      const { current } = templateInput;
      const pos = current.selectionStart;
      current.setRangeText(snippet, pos, pos);
      current.focus();

      // Trigger a DOM 'input' event
      const event = new Event("input", { bubbles: true });
      current.dispatchEvent(event);
    },
    [templateInput.current]
  );

  if (locked) {
    return (
      <Tab.Pane eventKey={eventKey} className="h-100">
        <Alert variant="info">
          You do not have edit permissions for this foundation
        </Alert>
        <Form.Group as={Row} controlId="formExtensionPointId">
          <Form.Label column sm={2}>
            Foundation Id
          </Form.Label>
          <Col sm={10}>
            <Field name="extensionPoint.metadata.id">
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control type="text" {...field} disabled />
              )}
            </Field>
          </Col>
        </Form.Group>
      </Tab.Pane>
    );
  }

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <Form.Group as={Row} controlId="formExtensionPointId">
        <Form.Label column sm={2}>
          Foundation Id
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.metadata.id">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control
                type="text"
                {...field}
                disabled={values.installed}
              />
            )}
          </Field>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formFoundationName">
        <Form.Label column sm={2}>
          Foundation Name
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.metadata.name">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formContainerSelector">
        <Form.Label column sm={2}>
          Container Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            name="extensionPoint.definition.containerSelector"
            initialElement={field.value}
            selectMode="container"
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formPosition">
        <Form.Label column sm={2}>
          Position
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.definition.position">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="select" {...field}>
                <option value="append">Append</option>
                <option value="prepend">Prepend</option>
              </Form.Control>
            )}
          </Field>
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formTemplate" className="pb-4">
        <Form.Label column sm={2}>
          Template
        </Form.Label>
        <Col sm={10}>
          <div>
            <span>Insert at cursor:</span>
            <a
              href="#"
              className="mx-2"
              role="button"
              onClick={(e) => {
                insertSnippet("{{{ heading }}}");
                e.preventDefault();
              }}
            >
              heading
            </a>
            <a
              href="#"
              className="mx-2"
              role="button"
              onClick={(e) => {
                insertSnippet("{{{ body }}}");
                e.preventDefault();
              }}
            >
              body
            </a>
          </div>
          <Field name="extensionPoint.definition.template">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control
                as="textarea"
                rows={4}
                {...field}
                ref={templateInput}
              />
            )}
          </Field>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default FoundationTab;
