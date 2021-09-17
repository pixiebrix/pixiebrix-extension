import React, { useCallback, useRef } from "react";
import { Form } from "react-bootstrap";
import { CustomFieldWidget } from "@/components/form/FieldTemplate";

const TemplateWidget: CustomFieldWidget = (props) => {
  const templateInput = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = useCallback((snippet) => {
    const { current } = templateInput;
    const pos = current.selectionStart;
    current.setRangeText(snippet, pos, pos);
    current.focus();

    // Trigger a DOM 'input' event
    const event = new Event("input", { bubbles: true });
    current.dispatchEvent(event);
  }, []);

  return (
    <div>
      <div className="small">
        <span>Insert at cursor:</span>
        <a
          href="#"
          className="mx-2"
          role="button"
          onClick={(e) => {
            insertSnippet("{{{ caption }}}");
            e.preventDefault();
          }}
        >
          caption
        </a>
        <a
          href="#"
          className="mx-2"
          role="button"
          onClick={(e) => {
            insertSnippet("{{{ icon }}}");
            e.preventDefault();
          }}
        >
          icon
        </a>
        <a
          href="#"
          className="mx-2"
          role="button"
          onClick={(e) => {
            insertSnippet("&nbsp;");
            e.preventDefault();
          }}
        >
          space
        </a>
      </div>
      <Form.Control as="textarea" rows={4} {...props} ref={templateInput} />
    </div>
  );
};

export default TemplateWidget;
