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
import { Form, FormControlProps } from "react-bootstrap";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";

const OmitFieldWidget: React.FC<SchemaFieldProps & FormControlProps> = ({
  name,
  schema,
  isRequired,
  uiSchema,
  hideLabel,
  isObjectProperty,
  isArrayItem,
  onClick,
  focusInput,
  ...restProps
}) => (
  <div
    onClick={onClick}
    // Divs with click handlers should have a button role for accessibility reasons
    role="button"
    // Also for accessibility, we make this "tab-able" by adding a tab index here
    tabIndex={0}
    // Finally, since the field can be tabbed over to, we add a handler for
    // enter-key so that this field can be switched to 'var' input and
    // focused, using the keyboard, just like a mouse click
    onKeyUp={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onClick();
      }
    }}
  >
    <Form.Control name={name} {...restProps} disabled />
  </div>
);

export default OmitFieldWidget;
