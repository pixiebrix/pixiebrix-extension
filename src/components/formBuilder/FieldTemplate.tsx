/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { FieldTemplateProps } from "@rjsf/core";
import { Form, ListGroup } from "react-bootstrap";
// Named import to get the proper type
import { DescriptionField } from "./DescriptionField";

const FieldTemplate = ({
  id,
  children,
  displayLabel,
  rawErrors = [],
  rawHelp,
  rawDescription,
}: FieldTemplateProps) => (
  <Form.Group>
    {children}
    {displayLabel && (
      <DescriptionField
        id={id}
        className="text-muted"
        description={rawDescription}
      />
    )}
    {rawErrors.length > 0 && (
      <ListGroup as="ul">
        {rawErrors.map((error: string) => (
          <ListGroup.Item as="li" key={error} className="border-0 m-0 p-0">
            <small className="m-0 text-danger">{error}</small>
          </ListGroup.Item>
        ))}
      </ListGroup>
    )}
    {rawHelp && (
      <Form.Text
        className={rawErrors.length > 0 ? "text-danger" : "text-muted"}
        id={id}
      >
        {rawHelp}
      </Form.Text>
    )}
  </Form.Group>
);

export default FieldTemplate;
