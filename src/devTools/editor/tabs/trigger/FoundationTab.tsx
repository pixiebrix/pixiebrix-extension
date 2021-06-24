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

import React from "react";
import { Field, FieldInputProps, useFormikContext } from "formik";
import { Col, Form, Row, Tab } from "react-bootstrap";
import SelectorSelectorField from "@/devTools/editor/fields/SelectorSelectorField";
import { FormState } from "@/devTools/editor/editorSlice";
import LockedFoundationTab from "@/devTools/editor/tabs/LockedFoundationTab";

const FoundationTab: React.FunctionComponent<{
  eventKey?: string;
  editable: Set<string>;
}> = ({ eventKey = "foundation", editable }) => {
  const { values } = useFormikContext<FormState>();

  const locked =
    values.installed && !editable?.has(values.extensionPoint.metadata.id);

  if (locked) {
    return <LockedFoundationTab eventKey={eventKey} />;
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
          Root Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            name="extensionPoint.definition.rootSelector"
            selectMode="container"
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formPosition">
        <Form.Label column sm={2}>
          Trigger
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.definition.trigger">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="select" {...field}>
                <option value="load">Load</option>
                <option value="click">Click</option>
                <option value="dblclick">Double Click</option>
                <option value="mouseover">Mouseover</option>
              </Form.Control>
            )}
          </Field>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default FoundationTab;
