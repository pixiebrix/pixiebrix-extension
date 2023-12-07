/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type FieldTemplateProps } from "@rjsf/utils";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form, ListGroup } from "react-bootstrap";
// Named import to get the proper type
import { DescriptionField } from "./DescriptionField";

// RJSF Bootstrap 4 implementation ref https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/bootstrap-4/src/FieldTemplate/FieldTemplate.tsx
const FieldTemplate = ({
  id,
  children,
  displayLabel,
  rawErrors = [],
  rawHelp,
  hidden,
  rawDescription,
  label,
  required,
}: FieldTemplateProps) => {
  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  return (
    <Form.Group>
      {displayLabel && (
        <Form.Label
          htmlFor={id}
          className={rawErrors.length > 0 ? "text-danger" : ""}
        >
          {label}
          {required ? "*" : null}
        </Form.Label>
      )}
      {children}
      {displayLabel && rawDescription && (
        <DescriptionField
          id={id}
          className="text-muted"
          description={rawDescription}
        />
      )}
      {rawErrors.length > 0 && (
        <ListGroup as="ul">
          {rawErrors.map((error, index) => (
            <ListGroup.Item
              as="li"
              key={`${error}-${index}`}
              className="border-0 m-0 p-0"
            >
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
};

export default FieldTemplate;
