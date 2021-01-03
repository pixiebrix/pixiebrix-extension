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

import React, { useCallback, useContext, useState } from "react";
import { Field, FieldInputProps, useField, useFormikContext } from "formik";
import { Button, Col, Form, Row, Tab } from "react-bootstrap";
import SelectorSelectorField from "@/devTools/editor/SelectorSelectorField";
import * as nativeOperations from "@/background/devtools";
import { FormState } from "@/devTools/editor/editorSlice";
import { DevToolsContext } from "@/devTools/context";
import { reportError } from "@/telemetry/logging";

const FoundationTab: React.FunctionComponent<{
  eventKey?: string;
}> = ({ eventKey = "foundation" }) => {
  const [field] = useField("containerInfo");

  const [dragging, setDragging] = useState(false);

  const { port } = useContext(DevToolsContext);
  const { values } = useFormikContext<FormState>();

  const toggle = useCallback(async () => {
    setDragging(true);
    try {
      await nativeOperations.dragButton(port, { uuid: values.uuid });
    } catch (err) {
      reportError(err);
    } finally {
      setDragging(false);
    }
  }, [values.uuid, port, setDragging]);

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <Form.Group as={Row} controlId="formExtensionPointId">
        <Form.Label column sm={2}>
          Foundation Id
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.metadata.id">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
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
          Drag and Drop
        </Form.Label>
        <Col sm={10}>
          <Button variant="info" disabled={dragging} onClick={toggle}>
            Drag and Drop
          </Button>
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

      {/*<Form.Group as={Row} controlId="formStyle">*/}
      {/*  <Form.Label column sm={2}>*/}
      {/*    Style*/}
      {/*  </Form.Label>*/}
      {/*  <Col sm={10}>*/}
      {/*    <Field name="extensionPoint.traits.style.mode">*/}
      {/*      {({ field }: { field: FieldInputProps<string> }) => (*/}
      {/*        <Form.Control as="select" {...field}>*/}
      {/*          <option value="inherit">Inherit</option>*/}
      {/*          <option value="default">Default</option>*/}
      {/*        </Form.Control>*/}
      {/*      )}*/}
      {/*    </Field>*/}
      {/*  </Col>*/}
      {/*</Form.Group>*/}

      <Form.Group as={Row} controlId="formTemplate" className="pb-4">
        <Form.Label column sm={2}>
          Template
        </Form.Label>
        <Col sm={10}>
          <Field name="extensionPoint.definition.template">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="textarea" rows={4} {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default FoundationTab;
