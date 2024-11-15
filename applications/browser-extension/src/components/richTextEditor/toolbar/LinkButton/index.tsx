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

import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCurrentEditor, type Editor } from "@tiptap/react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button, Overlay, Popover } from "react-bootstrap";
import styles from "./LinkButton.module.scss";
import {
  type PopoverState,
  POPOVER_VIEW,
} from "@/components/richTextEditor/toolbar/LinkButton/types";
import UrlInputPopover from "@/components/richTextEditor/toolbar/LinkButton/UrlInputPopover";

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
      if (editor.isActive("link") && !showPopover) {
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
  }, [editor, showPopover]);

  const handleHide = useCallback((event: Event) => {
    const buttonParent = buttonRef.current?.parentElement as EventTarget;
    // Prevent the click outside behavior from closing when the button or the container are clicked
    const path = event.composedPath();
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
        disabled={!editor.isEditable}
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
        placement="top"
        rootClose
        // Prevent handleHide from triggering due to the onSelectionChange event
        rootCloseEvent="mousedown"
        onHide={handleHide}
        popperConfig={{
          strategy: "fixed",
        }}
      >
        <Popover
          // Remount the popover to force the placement to be recalculated when the
          // popover view changes
          key={popoverView}
          id="urlInputPopover"
          className={styles.linkPopover}
        >
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
