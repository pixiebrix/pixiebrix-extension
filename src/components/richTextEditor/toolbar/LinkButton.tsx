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

import React, { useEffect, useRef, useState } from "react";
import { type Editor, useCurrentEditor } from "@tiptap/react";
// eslint-disable-next-line no-restricted-imports -- we need flexible styling for this component
import { Button, Form, Overlay, Popover } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import styles from "./LinkButton.module.scss";

const LinkPreviewActions: React.FC<{
  href: string;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ href, onEdit, onRemove }) => (
  <span>
    Visit url:{" "}
    <a href={href} target="_blank" rel="noopener noreferrer">
      {href}
    </a>
    <Button variant="link" onClick={onEdit}>
      Edit
    </Button>
    <Button variant="link" onClick={onRemove}>
      Remove
    </Button>
  </span>
);

const LinkEditForm: React.FC<{
  initialHref: string;
  onSubmit: (url: string) => void;
}> = ({ initialHref, onSubmit }) => (
  <Form
    inline
    onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      onSubmit(formData.get("newUrl") as string);
    }}
  >
    <Form.Label htmlFor="newUrl">Enter link:</Form.Label>
    <Form.Control
      id="newUrl"
      name="newUrl"
      size="sm"
      defaultValue={initialHref}
    />
    <Button variant="link" type="submit" size="sm">
      Submit
    </Button>
  </Form>
);

const LinkOverlay: React.FunctionComponent<{
  showPopover: boolean;
  popoverView: "editForm" | "linkPreview";
  target: React.RefObject<HTMLElement>;
  setPopoverState: (state: {
    showPopover: boolean;
    popoverView: "editForm" | "linkPreview";
  }) => void;
}> = ({ showPopover, popoverView, target, setPopoverState }) => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  const handleSubmit = async (url: string) => {
    if (!url || url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }

    setPopoverState({ showPopover: false, popoverView: "editForm" });
  };

  const renderContent = () => {
    if (popoverView === "linkPreview") {
      return (
        <LinkPreviewActions
          href={editor.getAttributes("link").href}
          onEdit={() => {
            setPopoverState({
              showPopover: true,
              popoverView: "editForm",
            });
          }}
          onRemove={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            setPopoverState({ showPopover: false, popoverView: "linkPreview" });
          }}
        />
      );
    }

    if (popoverView === "editForm") {
      return (
        <LinkEditForm
          initialHref={editor.getAttributes("link").href ?? ""}
          onSubmit={handleSubmit}
        />
      );
    }

    return null;
  };

  return (
    <Overlay
      show={showPopover}
      target={target.current}
      placement="top"
      rootClose
      rootCloseEvent="mousedown"
      onHide={() => {
        setPopoverState({ showPopover: false, popoverView });
      }}
    >
      <Popover id="urlInputPopover" className={styles.bubbleMenu}>
        {renderContent()}
      </Popover>
    </Overlay>
  );
};

const LinkButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();
  const [{ showPopover, popoverView }, setPopoverState] = useState<{
    showPopover: boolean;
    popoverView: "linkPreview" | "editForm";
  }>({
    showPopover: false,
    popoverView: "editForm",
  });
  const target = useRef(null);

  useEffect(() => {
    const onSelectionUpdate = ({ editor }: { editor: Editor }) => {
      if (editor.isActive("link")) {
        setPopoverState({
          showPopover: true,
          popoverView: "linkPreview",
        });
      }
    };

    editor?.on("selectionUpdate", onSelectionUpdate);

    return () => {
      editor?.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <Button
        ref={target}
        variant="default"
        active={editor.isActive("link")}
        aria-label="Link"
        onClick={() => {
          if (editor.state.selection.empty) {
            return;
          }

          setPopoverState({
            showPopover: true,
            popoverView: editor.isActive("link") ? "linkPreview" : "editForm",
          });
        }}
      >
        <FontAwesomeIcon icon={faLink} />
      </Button>

      <LinkOverlay
        showPopover={showPopover}
        popoverView={popoverView}
        target={target}
        setPopoverState={setPopoverState}
      />
    </>
  );
};

export default LinkButton;
