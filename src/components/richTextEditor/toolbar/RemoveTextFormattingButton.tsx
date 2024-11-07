import React from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRemoveFormat } from "@fortawesome/free-solid-svg-icons";

const RemoveTextFormattingButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <Button
      variant="default"
      onClick={() => editor.chain().focus().unsetAllMarks().run()}
      disabled={
        editor.isEditable
          ? !editor.can().chain().focus().unsetAllMarks().run()
          : true
      }
      aria-label="Remove Formatting"
    >
      <FontAwesomeIcon icon={faRemoveFormat} />
    </Button>
  );
};

export default RemoveTextFormattingButton;
