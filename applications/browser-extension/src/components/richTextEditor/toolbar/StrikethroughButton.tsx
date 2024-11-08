import React from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStrikethrough } from "@fortawesome/free-solid-svg-icons";

const StrikethroughButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <Button
      variant="default"
      onClick={() => editor.chain().focus().toggleStrike().run()}
      disabled={
        editor.isEditable
          ? !editor.can().chain().focus().toggleStrike().run()
          : true
      }
      active={editor.isActive("strike")}
      aria-label="Strikethrough"
    >
      <FontAwesomeIcon icon={faStrikethrough} />
    </Button>
  );
};

export default StrikethroughButton;
