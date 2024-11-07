import React from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinusSquare } from "@fortawesome/free-solid-svg-icons";

const HorizontalRuleButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <Button
      variant="default"
      onClick={() => editor.chain().focus().setHorizontalRule().run()}
      disabled={
        editor.isEditable
          ? !editor.can().chain().focus().setHorizontalRule().run()
          : true
      }
      aria-label="Horizontal Rule"
    >
      <FontAwesomeIcon icon={faMinusSquare} />
    </Button>
  );
};

export default HorizontalRuleButton;
