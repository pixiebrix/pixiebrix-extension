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
  type Dispatch,
  type SetStateAction,
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
import { type ValueOf } from "type-fest";
// eslint-disable-next-line no-restricted-imports -- Not a schema-driven form
import { Formik } from "formik";
import { assertNotNullish } from "@/utils/nullishUtils";
import { truncate } from "lodash";

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
  <span className="d-flex align-items-center">
    <span className="text-nowrap mr-1">Visit url:</span>
    <a href={href} target="_blank" rel="noopener noreferrer" className="mr-2">
      {truncate(href, {
        length: 20,
        omission: "...",
      })}
    </a>
    <Button variant="link" onClick={onEdit} className="mr-2">
      Edit
    </Button>
    <Button variant="link" onClick={onRemove}>
      Remove
    </Button>
  </span>
);

const LinkEditForm: React.FC<{
  initialHref: string;
  setPopoverState: Dispatch<SetStateAction<PopoverState>>;
}> = ({ initialHref, setPopoverState }) => {
  const { editor } = useCurrentEditor();
  assertNotNullish(editor, "Tiptap editor must be in scope");

  const onSubmit = useCallback(
    (url: string) => {
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

      setPopoverState({
        showPopover: false,
        popoverView: POPOVER_VIEW.editForm,
      });
    },
    [editor, setPopoverState],
  );

  return (
    <Formik
      initialValues={{ newUrl: initialHref }}
      onSubmit={(values) => {
        onSubmit(values.newUrl);
      }}
    >
      {({ handleSubmit, handleChange, handleBlur, values }) => (
        <Form inline onSubmit={handleSubmit}>
          <Form.Label htmlFor="newUrl">Enter link:</Form.Label>
          <Form.Control
            id="newUrl"
            name="newUrl"
            size="sm"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.newUrl}
          />
          <Button variant="link" type="submit" size="sm">
            Submit
          </Button>
        </Form>
      )}
    </Formik>
  );
};

const UrlInputPopover = ({
  setPopoverState,
  popoverView,
}: {
  setPopoverState: Dispatch<SetStateAction<PopoverState>>;
  popoverView: PopoverState["popoverView"];
}) => {
  const { editor } = useCurrentEditor();
  assertNotNullish(editor, "Tiptap editor must be in scope");

  switch (popoverView) {
    case POPOVER_VIEW.linkPreview: {
      return (
        <LinkPreviewActions
          href={editor.getAttributes("link").href as string}
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

    case POPOVER_VIEW.editForm: {
      return (
        <LinkEditForm
          initialHref={(editor.getAttributes("link").href as string) ?? ""}
          setPopoverState={setPopoverState}
        />
      );
    }

    default: {
      return null;
    }
  }
};

const LinkButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();
  const [{ showPopover, popoverView }, setPopoverState] =
    useState<PopoverState>({
      showPopover: false,
      popoverView: POPOVER_VIEW.editForm,
    });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [buttonElement, setButtonElement] = useState<HTMLButtonElement | null>(
    null,
  );

  useEffect(() => {
    setButtonElement(buttonRef.current);
  }, []);

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

  const handleHide = useCallback((event: Event) => {
    // Check if the click path includes our button
    const path = event.composedPath();
    const buttonParent = buttonRef.current?.parentElement as EventTarget;
    if (path.includes(buttonParent)) {
      return;
    }

    setPopoverState((state) => ({ ...state, showPopover: false }));
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="default"
        active={editor.isActive("link")}
        aria-label="Link"
        onClick={() => {
          if (editor.state.selection.empty && !showPopover) {
            return;
          }

          if (showPopover) {
            setPopoverState((state) => ({ ...state, showPopover: false }));
          } else {
            setPopoverState({
              showPopover: true,
              popoverView: editor.isActive("link")
                ? POPOVER_VIEW.linkPreview
                : POPOVER_VIEW.editForm,
            });
          }
        }}
      >
        <FontAwesomeIcon icon={faLink} />
      </Button>

      <Overlay
        target={buttonElement}
        // Attach the portal to the button's parent so it receives
        // the correct styling from IsolatedComponent
        container={buttonElement?.parentElement}
        show={showPopover}
        placement="top-end"
        rootClose
        onHide={handleHide}
        popperConfig={{
          strategy: "fixed",
        }}
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
