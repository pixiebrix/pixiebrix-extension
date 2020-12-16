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
import { PayloadAction } from "@reduxjs/toolkit";
import { Field, FieldInputProps } from "formik";
import { Col, Form, Row, Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/editorSlice";
import IconField, { iconSchema } from "@/components/fields/IconField";

const MenuItemTab: React.FunctionComponent<{
  eventKey?: string;
  element: FormState;
  dispatch: (action: PayloadAction<unknown>) => void;
}> = ({ eventKey = "menuItem" }) => {
  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <Form.Group as={Row} controlId="formCaption">
        <Form.Label column sm={2}>
          Caption
        </Form.Label>
        <Col sm={10}>
          <Field name="extension.caption">
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control type="text" {...field} />
            )}
          </Field>
        </Col>
      </Form.Group>

      <IconField label="Icon" name="extension.icon" schema={iconSchema} />
    </Tab.Pane>
  );
};

export default MenuItemTab;
