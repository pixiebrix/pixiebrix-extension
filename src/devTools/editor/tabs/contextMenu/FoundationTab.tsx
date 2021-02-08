/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import React, { useMemo } from "react";
import { Field, FieldInputProps, useField, useFormikContext } from "formik";
import { Alert, Col, Form, Row, Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/editorSlice";
import Select from "react-select";

const CONTEXTS = [
  "page",
  "all",
  "frame",
  "selection",
  "link",
  "editable",
  "image",
  "video",
  "audio",
];

const contextOptions = CONTEXTS.map((value) => ({ value, label: value }));

interface ContextOption {
  value: string;
  label: string;
}

const ContextSelector: React.FunctionComponent<{ name: string }> = ({
  name,
}) => {
  const [field, , helpers] = useField<string[]>(name);
  return (
    <Select
      isMulti
      isClearable={false}
      options={contextOptions}
      value={contextOptions.filter((x) => field.value.includes(x.value))}
      onChange={(values) =>
        helpers.setValue((values as any).map((x: ContextOption) => x.value))
      }
    />
  );
};

const FoundationTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
}> = ({ eventKey = "foundation", editable }) => {
  const { values } = useFormikContext<FormState>();

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

      <Form.Group as={Row} controlId="formPosition">
        <Form.Label column sm={2}>
          Contexts
        </Form.Label>
        <Col sm={10}>
          <ContextSelector name="extensionPoint.definition.contexts" />
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default FoundationTab;
