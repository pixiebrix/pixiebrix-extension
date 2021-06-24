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

import React, { useCallback, useRef } from "react";
import { FastField, FieldInputProps, useField } from "formik";
import { Col, Form, Row, Tab } from "react-bootstrap";

const MenuItemTab: React.FunctionComponent<{
  eventKey?: string;
}> = ({ eventKey = "menuItem" }) => {
  const captionInput = useRef<HTMLInputElement>(null);

  const labelHelpers = useField<string>("label")[2];

  const insertSnippet = useCallback(
    (snippet) => {
      const { current } = captionInput;
      const pos = current.selectionStart;
      current.setRangeText(snippet, pos, pos);
      current.focus();

      // Trigger a DOM 'input' event
      const event = new Event("input", { bubbles: true });
      current.dispatchEvent(event);
    },
    [captionInput.current]
  );

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <Form.Group as={Row} controlId="formCaption">
        <Form.Label column sm={2}>
          Caption
        </Form.Label>
        <Col sm={10}>
          <div className="small">
            <span>Insert at cursor:</span>
            <a
              href="#"
              className="mx-2"
              role="button"
              onClick={(e) => {
                insertSnippet("%s");
                e.preventDefault();
              }}
            >
              selected text
            </a>
          </div>
          <FastField name="extension.title">
            {({
              field: { onChange, ...otherFieldProps },
            }: {
              field: FieldInputProps<string>;
            }) => (
              <Form.Control
                type="text"
                {...otherFieldProps}
                onChange={(event) => {
                  labelHelpers.setValue(event.target.value);
                  onChange(event);
                }}
                ref={captionInput}
              />
            )}
          </FastField>
          <Form.Text className="text-muted">
            The context menu item caption. Use the <code>%s</code> placeholder
            to have Chrome dynamically insert the current selection in the menu
            caption
          </Form.Text>
        </Col>
      </Form.Group>
    </Tab.Pane>
  );
};

export default MenuItemTab;
