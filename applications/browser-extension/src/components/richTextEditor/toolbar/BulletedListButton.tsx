import React from "react";
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListUl } from "@fortawesome/free-solid-svg-icons";

const BulletedListButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <Button
      variant="default"
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      disabled={
        editor.isEditable
          ? !editor.can().chain().focus().toggleBulletList().run()
          : true
      }
      active={editor.isActive("bulletList")}
      aria-label="Bullet List"
    >
      <FontAwesomeIcon icon={faListUl} />
    </Button>
  );
};

export default BulletedListButton;
