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
import { FastField, FieldInputProps } from "formik";
import { Col, Form, Row, Tab } from "react-bootstrap";
import IconField, { iconSchema } from "@/components/fields/IconField";
import ToggleField from "@/devTools/editor/components/ToggleField";

const MenuItemTab: React.FunctionComponent<{
  eventKey?: string;
}> = ({ eventKey = "menuItem" }) => {
  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <Form.Group as={Row} controlId="formCaption">
        <Form.Label column sm={2}>
          Caption
        </Form.Label>
        <Col sm={10}>
          <FastField name="extension.caption">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </FastField>
          <Form.Text className="text-muted">
            The button caption, which can use data from the reader
          </Form.Text>
        </Col>
      </Form.Group>

      <Form.Group as={Row} controlId="formDynamicCaption">
        <Form.Label column sm={2}>
          Dynamic Caption
        </Form.Label>
        <Col sm={10}>
          <ToggleField name="extension.dynamicCaption" />
          <Form.Text className="text-muted">
            Toggle on to enabling templates in the caption. Turning dynamic
            captions on may slow down menu rendering if your menu reads a lot of
            data
          </Form.Text>
        </Col>
      </Form.Group>

      <IconField label="Icon" name="extension.icon" schema={iconSchema} />
    </Tab.Pane>
  );
};

export default MenuItemTab;
