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

import React, { useContext } from "react";
import { PayloadAction } from "@reduxjs/toolkit";
import { DevToolsContext } from "@/devTools/context";
import { Field, FieldInputProps, useFormikContext } from "formik";
import { Button, Col, Form, Row, Tab } from "react-bootstrap";
import * as nativeOperations from "@/background/devtools";
import { ButtonState, actions } from "@/devTools/editor/editorSlice";
import SelectorSelectorField from "@/devTools/editor/SelectorSelectorField";

const FoundationTab: React.FunctionComponent<{
  element: ButtonState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ element, dispatch }) => {
  const { port } = useContext(DevToolsContext);
  const { isSubmitting, isValid } = useFormikContext();

  return (
    <Tab.Pane eventKey="foundation">
      <Form.Group as={Row} controlId="formContainerSelector">
        <Form.Label column sm={2}>
          Container Selector
        </Form.Label>
        <Col sm={10}>
          <SelectorSelectorField
            name="containerSelector"
            suggestions={element.containerSelectorOptions}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formPosition">
        <Form.Label column sm={2}>
          Position
        </Form.Label>
        <Col sm={10}>
          <Field name="position">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="select" {...field}>
                <option value="append">Append</option>
                <option value="prepend">Prepend</option>
              </Form.Control>
            )}
          </Field>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="formCaption">
        <Form.Label column sm={2}>
          Caption
        </Form.Label>
        <Col sm={10}>
          <Field name="caption">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formCaption">
        <Form.Label column sm={2}>
          Template
        </Form.Label>
        <Col sm={10}>
          <Field name="template">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="textarea" rows={4} {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>

      <Form.Group as={Row}>
        <Col>
          <Button
            variant="danger"
            className="mr-2"
            onClick={async () => {
              await nativeOperations.removeElement(port, {
                uuid: element.uuid,
              });
              dispatch(actions.removeElement(element.uuid));
            }}
          >
            Remove
          </Button>

          <Button
            className="mx-2"
            disabled={isSubmitting || !isValid}
            type="submit"
            variant="primary"
          >
            Save Button
          </Button>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default FoundationTab;
