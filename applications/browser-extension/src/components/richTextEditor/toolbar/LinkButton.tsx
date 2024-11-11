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

import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { type Editor, useCurrentEditor } from "@tiptap/react";
// eslint-disable-next-line no-restricted-imports -- we need flexible styling for this component
import { Button, Form, Overlay, Popover } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import styles from "@/components/richTextEditor/toolbar/LinkButton.module.scss";
import { ValueOf } from "type-fest";

const POPOVER_VIEW = {
  linkPreview: "linkPreview",
  editForm: "editForm",
} as const;

type PopoverState = {
  showPopover: boolean;
  popoverView: ValueOf<typeof POPOVER_VIEW>;
};

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

const UrlInputPopover = ({
  setPopoverState,
  popoverView,
}: {
  setPopoverState: Dispatch<SetStateAction<PopoverState>>;
  popoverView: PopoverState["popoverView"];
}) => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  const handleSubmit = useCallback((url: string) => {
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

    setPopoverState({ showPopover: false, popoverView: POPOVER_VIEW.editForm });
  }, []);

  if (popoverView === POPOVER_VIEW.linkPreview) {
    return (
      <LinkPreviewActions
        href={editor.getAttributes("link").href}
        onEdit={() => {
          setPopoverState({
            showPopover: true,
            popoverView: POPOVER_VIEW.editForm,
          });
        }}
        onRemove={() => {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          setPopoverState({
            showPopover: false,
            popoverView: POPOVER_VIEW.linkPreview,
          });
        }}
      />
    );
  }

  if (popoverView === POPOVER_VIEW.editForm) {
    return (
      <LinkEditForm
        initialHref={editor.getAttributes("link").href ?? ""}
        onSubmit={handleSubmit}
      />
    );
  }

  return null;
};

const LinkButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();
  const [{ showPopover, popoverView }, setPopoverState] =
    useState<PopoverState>({
      showPopover: false,
      popoverView: POPOVER_VIEW.editForm,
    });
  const buttonRef = useRef(null);

  useEffect(() => {
    const onSelectionUpdate = ({ editor }: { editor: Editor }) => {
      if (editor.isActive("link")) {
        setPopoverState({
          showPopover: true,
          popoverView: POPOVER_VIEW.linkPreview,
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

  const handleHide = useCallback((event: Event) => {
    // Check if the click path includes our button
    const path = event.composedPath();
    if (buttonRef.current && path.includes(buttonRef.current)) {
      return;
    }

    setPopoverState((state) => ({ ...state, showPopover: false }));
  }, []);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="default"
        active={editor.isActive("link")}
        aria-label="Link"
        onClick={() => {
          if (editor.state.selection.empty) {
            return;
          }

          setPopoverState({
            showPopover: true,
            popoverView: editor.isActive("link")
              ? POPOVER_VIEW.linkPreview
              : POPOVER_VIEW.editForm,
          });
        }}
      >
        <FontAwesomeIcon icon={faLink} />
      </Button>

      <Overlay
        show={showPopover}
        target={buttonRef.current}
        placement="top"
        rootClose
        onHide={handleHide}
      >
        <Popover id="urlInputPopover" className={styles.bubbleMenu}>
          <UrlInputPopover
            setPopoverState={setPopoverState}
            popoverView={popoverView}
          />
        </Popover>
      </Overlay>
    </>
  );
};

export default LinkButton;
