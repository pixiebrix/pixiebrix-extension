import React from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListOl } from "@fortawesome/free-solid-svg-icons";

const NumberedListButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <Button
      variant="default"
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      disabled={
        editor.isEditable
          ? !editor.can().chain().focus().toggleOrderedList().run()
          : true
      }
      active={editor.isActive("orderedList")}
      aria-label="Numbered List"
    >
      <FontAwesomeIcon icon={faListOl} />
    </Button>
  );
};

export default NumberedListButton;
