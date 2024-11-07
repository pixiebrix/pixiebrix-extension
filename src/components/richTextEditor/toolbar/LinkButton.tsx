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

import React, { useRef, useState } from "react";
import { useCurrentEditor } from "@tiptap/react";
// eslint-disable-next-line no-restricted-imports -- we need flexible styling for this component
import { Button, Form, Overlay, Popover } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import styles from "./LinkButton.module.scss";

const LinkButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();
  const [showInputPopover, setShowInputPopover] = useState(false);
  const target = useRef(null);

  if (!editor) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = formData.get("newUrl") as string;

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

    setShowInputPopover(false);
    editor.commands.focus();
  };

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

          setShowInputPopover(!showInputPopover);
        }}
      >
        <FontAwesomeIcon icon={faLink} />
      </Button>

      <Overlay
        show={showInputPopover}
        target={target.current}
        placement="top"
        rootClose
        onHide={() => {
          setShowInputPopover(false);
        }}
      >
        <Popover id="urlInputPopover" className={styles.bubbleMenu}>
          <Form inline onSubmit={handleSubmit}>
            <Form.Label htmlFor="newUrl">Enter link:</Form.Label>
            <Form.Control
              id="newUrl"
              name="newUrl"
              size="sm"
              defaultValue={editor.getAttributes("link").href ?? ""}
            />
            <Button variant="link" type="submit" size="sm">
              Submit
            </Button>
          </Form>
        </Popover>
      </Overlay>
    </>
  );
};

export default LinkButton;
