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

import React from "react";
import { Col, Form, Row, Tab } from "react-bootstrap";
import { Field, FieldInputProps } from "formik";

const MetaTab: React.FunctionComponent<{
  eventKey?: string;
}> = ({ eventKey = "meta" }) => {
  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <Form.Group as={Row} controlId="extensionName">
        <Form.Label column sm={2}>
          Name
        </Form.Label>
        <Col sm={10}>
          <Field name="label">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </Field>
          <Form.Text className="text-muted">
            A name for this extension so that you can find it later
          </Form.Text>
        </Col>
      </Form.Group>
      <Form.Group as={Row} controlId="extensionId">
        <Form.Label column sm={2}>
          UUID
        </Form.Label>
        <Col sm={10}>
          <Field name="uuid">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} disabled />
            )}
          </Field>
          <Form.Text className="text-muted">
            An automatically generated unique identifier for this extension
          </Form.Text>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default MetaTab;
