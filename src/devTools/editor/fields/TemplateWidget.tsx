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

import React, { useCallback, useRef } from "react";
import { Form } from "react-bootstrap";
import { CustomFieldWidgetProps } from "@/components/form/FieldTemplate";

export type Snippet = {
  label: string;
  value: string;
};

type TemplateWidgetProperties = CustomFieldWidgetProps & {
  disabled?: boolean;
  rows: number;
  snippets?: Snippet[];
};

const TemplateWidget: React.FC<TemplateWidgetProperties> = ({
  snippets = [],
  rows = 4,
  ...properties
}) => {
  const templateInput = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const insertSnippet = useCallback((snippet) => {
    const { current } = templateInput;
    const pos = current.selectionStart;
    current.setRangeText(snippet, pos, pos);
    current.focus();

    // Trigger a DOM 'input' event
    const event = new Event("input", { bubbles: true });
    current.dispatchEvent(event);
  }, []);

  const controlProperties =
    rows === 1
      ? { as: "input" as React.ElementType, type: "text" }
      : { as: "textarea" as React.ElementType, rows };

  return (
    <div>
      {!properties.disabled && (
        <div className="small">
          <span>Insert at cursor:</span>
          {snippets.map((snippet: Snippet) => (
            <a
              key={snippet.label}
              href="#"
              className="mx-2"
              role="button"
              onClick={(e) => {
                insertSnippet(snippet.value);
                e.preventDefault();
              }}
            >
              {snippet.label}
            </a>
          ))}
        </div>
      )}
      <Form.Control
        {...controlProperties}
        {...properties}
        ref={templateInput}
      />
    </div>
  );
};

export default TemplateWidget;
