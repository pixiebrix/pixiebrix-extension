/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useCallback, useRef } from "react";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form } from "react-bootstrap";
import { type CustomFieldWidgetProps } from "@/components/form/FieldTemplate";
import { LinkButton } from "@/components/LinkButton";
import { freeze } from "@/utils/objectUtils";

export type Snippet = {
  label: string;
  value: string;
};

type TemplateWidgetProps = CustomFieldWidgetProps & {
  disabled?: boolean;
  rows: number;
  snippets?: Snippet[];
};

const EMPTY_ARRAY = freeze<Snippet[]>([]);

const TemplateWidget: React.FC<TemplateWidgetProps> = ({
  snippets = EMPTY_ARRAY,
  rows = 4,
  value,
  ...props
}) => {
  const templateInput = useRef<HTMLTextAreaElement | HTMLInputElement | null>(
    null,
  );

  const insertSnippet = useCallback((snippet: string) => {
    const { current } = templateInput;
    if (!current) {
      return;
    }

    const pos = current.selectionStart ?? 0;
    current.setRangeText(snippet, pos, pos);
    current.focus();

    // Trigger a DOM 'input' event
    const event = new Event("input", { bubbles: true });
    current.dispatchEvent(event);
  }, []);

  const controlProps =
    rows === 1
      ? { as: "input" as React.ElementType, type: "text" }
      : { as: "textarea" as React.ElementType, rows };

  return (
    <div>
      {!props.disabled && (
        <div className="small">
          <span>Insert at cursor:</span>
          {snippets.map((snippet: Snippet) => (
            <LinkButton
              key={snippet.label}
              className="ml-2"
              onClick={(event) => {
                insertSnippet(snippet.value);
              }}
            >
              {snippet.label}
            </LinkButton>
          ))}
        </div>
      )}
      <Form.Control
        {...controlProps}
        {...props}
        ref={templateInput}
        value={value ?? undefined}
      />
    </div>
  );
};

export default TemplateWidget;
