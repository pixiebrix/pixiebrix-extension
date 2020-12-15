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
import { FormState } from "@/devTools/editor/editorSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { Col, Form, Row, Tab } from "react-bootstrap";
import { Field, FieldInputProps } from "formik";

const MetaTab: React.FunctionComponent<{
  element: FormState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = () => {
  return (
    <Tab.Pane eventKey="metadata" className="h-100">
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
      <Form.Group as={Row} controlId="formReaderId" className="pb-4">
        <Form.Label column sm={2}>
          Reader Id
        </Form.Label>
        <Col sm={10}>
          <Field name="reader.metadata.id">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default MetaTab;
