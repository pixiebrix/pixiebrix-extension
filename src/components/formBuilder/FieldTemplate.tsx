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

import styles from "./FieldTemplate.module.scss";
import React, { useCallback } from "react";
import cx from "classnames";
import { type FieldTemplateProps } from "@rjsf/utils";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form, ListGroup } from "react-bootstrap";
// Named import to get the proper type
import { DescriptionField } from "./DescriptionField";
import { type SetActiveField } from "@/components/formBuilder/formBuilderTypes";
import { UI_SCHEMA_ACTIVE } from "@/components/formBuilder/schemaFieldNames";
import { type Nullishable } from "@/utils/nullishUtils";

interface FormPreviewFieldTemplateProps extends FieldTemplateProps {
  setActiveField: Nullishable<SetActiveField>;
}

// RJSF Bootstrap 4 implementation ref https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/bootstrap-4/src/FieldTemplate/FieldTemplate.tsx
const FieldTemplate = ({
  id,
  children,
  displayLabel,
  rawErrors = [],
  rawHelp,
  hidden,
  rawDescription,
  required,
  uiSchema,
  setActiveField,
  schema: { title },
}: FormPreviewFieldTemplateProps) => {
  // eslint-disable-next-line security/detect-object-injection -- is a constant
  const isActive = Boolean(uiSchema?.[UI_SCHEMA_ACTIVE]);

  const onClick = useCallback(() => {
    // We're getting an additional event from `#root`
    if (
      typeof setActiveField === "function" &&
      !isActive &&
      id.startsWith("root_")
    ) {
      setActiveField(id.replace("root_", ""));
    }
  }, [id, isActive, setActiveField]);

  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  return (
    <Form.Group
      onClick={onClick}
      className={cx(styles.root, {
        [styles.isActive ?? ""]: isActive,
      })}
    >
      {displayLabel && (
        <Form.Label
          htmlFor={id}
          className={rawErrors.length > 0 ? "text-danger" : ""}
        >
          {/* Cannot use the label prop as RJSF5 defaults to the name if the title is falsy
           * See https://github.com/rjsf-team/react-jsonschema-form/blob/e8aa9e8f2078d86a6048ff3d018bd3030d8d2aba/packages/core/src/components/fields/SchemaField.tsx#L196
           * See https://github.com/pixiebrix/pixiebrix-extension/issues/7106
           */}
          {title}
          {required ? "*" : null}
        </Form.Label>
      )}
      {children}
      {displayLabel && rawDescription && (
        <DescriptionField className="text-muted" description={rawDescription} />
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
