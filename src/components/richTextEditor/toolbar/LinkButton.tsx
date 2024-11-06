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

import React from "react";
import { useCurrentEditor, BubbleMenu } from "@tiptap/react";
// eslint-disable-next-line no-restricted-imports -- we need flexible styling for this component
import { Button, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import styles from "./LinkButton.module.scss";

const LinkButton: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  const handleClick = async () => {
    // TODO: typing for getAttributes is any, better solution?
    // const previousUrl =
    //   typeof editor.getAttributes("link").href === "string"
    //     ? (editor.getAttributes("link").href as string)
    //     : null;
    // Implement me
    const url = "";
    if (!url) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <>
      <BubbleMenu editor={editor} className={styles.bubbleMenu}>
        <Form inline>
          <Form.Label htmlFor="newUrl">Enter link:</Form.Label>
          <Form.Control id="newUrl" size="sm" />
          <Button variant="link" type="submit" size="sm">
            Submit
          </Button>
        </Form>
      </BubbleMenu>
      <Button
        variant="default"
        onClick={handleClick}
        active={editor.isActive("link")}
        aria-label="Link"
      >
        <FontAwesomeIcon icon={faLink} />
      </Button>
    </>
  );
};

export default LinkButton;
