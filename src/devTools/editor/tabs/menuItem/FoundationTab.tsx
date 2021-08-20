/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useMemo, useRef } from "react";
import {
  FastField,
  Field,
  FieldInputProps,
  useField,
  useFormikContext,
} from "formik";
import { Alert, Col, Form, Row, Tab } from "react-bootstrap";
import SelectorSelectorField from "@/devTools/editor/fields/SelectorSelectorField";
import { ActionFormState } from "@/devTools/editor/extensionPoints/menuItem";

const FoundationTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
}> = ({ eventKey = "foundation", editable }) => {
  const [containerInfoField] = useField("containerInfo");

  const { values } = useFormikContext<ActionFormState>();
  const templateInput = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = useCallback((snippet) => {
    const { current } = templateInput;
    const pos = current.selectionStart;
    current.setRangeText(snippet, pos, pos);
    current.focus();

    // Trigger a DOM 'input' event
    const event = new Event("input", { bubbles: true });
    current.dispatchEvent(event);
  }, []);

  const locked = useMemo(
    () => values.installed && !editable?.has(values.extensionPoint.metadata.id),
    [editable, values.installed, values.extensionPoint.metadata.id]
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
            <FastField name="extensionPoint.metadata.id">
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control type="text" {...field} disabled />
              )}
            </FastField>
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
          <FastField name="extensionPoint.metadata.id">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control
                type="text"
                {...field}
                disabled={values.installed}
              />
            )}
          </FastField>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formFoundationName">
        <Form.Label column sm={2}>
          Foundation Name
        </Form.Label>
        <Col sm={10}>
          <FastField name="extensionPoint.metadata.name">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </FastField>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formContainerSelector">
        <Form.Label column sm={2}>
          Container Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            name="extensionPoint.definition.containerSelector"
            initialElement={containerInfoField.value}
            selectMode="container"
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formPosition">
        <Form.Label column sm={2}>
          Position
        </Form.Label>
        <Col sm={10}>
          {typeof values.extensionPoint.definition.position === "string" ? (
            <Field name="extensionPoint.definition.position">
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control as="select" {...field}>
                  <option value="append">Append</option>
                  <option value="prepend">Prepend</option>
                </Form.Control>
              )}
            </Field>
          ) : (
            <>
              <SelectorSelectorField
                isClearable
                sort
                name="extensionPoint.definition.position.sibling"
                selectMode="element"
                root={values.extensionPoint.definition.containerSelector}
              />
              <Form.Text className="text-muted">
                Select an element in the container to position the menu item
                before. Or, leave blank to append the element to the container.
              </Form.Text>
            </>
          )}
        </Col>
      </Form.Group>

      {/* <Form.Group as={Row} controlId="formStyle"> */}
      {/*  <Form.Label column sm={2}> */}
      {/*    Style */}
      {/*  </Form.Label> */}
      {/*  <Col sm={10}> */}
      {/*    <Field name="extensionPoint.traits.style.mode"> */}
      {/*      {({ field }: { field: FieldInputProps<string> }) => ( */}
      {/*        <Form.Control as="select" {...field}> */}
      {/*          <option value="inherit">Inherit</option> */}
      {/*          <option value="default">Default</option> */}
      {/*        </Form.Control> */}
      {/*      )} */}
      {/*    </Field> */}
      {/*  </Col> */}
      {/* </Form.Group> */}

      <Form.Group as={Row} controlId="formTemplate" className="pb-4">
        <Form.Label column sm={2}>
          Template
        </Form.Label>
        <Col sm={10}>
          {!locked && (
            <div className="small">
              <span>Insert at cursor:</span>
              <a
                href="#"
                className="mx-2"
                role="button"
                onClick={(e) => {
                  insertSnippet("{{{ caption }}}");
                  e.preventDefault();
                }}
              >
                caption
              </a>
              <a
                href="#"
                className="mx-2"
                role="button"
                onClick={(e) => {
                  insertSnippet("{{{ icon }}}");
                  e.preventDefault();
                }}
              >
                icon
              </a>
              <a
                href="#"
                className="mx-2"
                role="button"
                onClick={(e) => {
                  insertSnippet("&nbsp;");
                  e.preventDefault();
                }}
              >
                space
              </a>
            </div>
          )}
          <FastField name="extensionPoint.definition.template">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control
                as="textarea"
                rows={4}
                {...field}
                ref={templateInput}
              />
            )}
          </FastField>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default FoundationTab;
