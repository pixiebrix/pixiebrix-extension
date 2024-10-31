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

import styles from "./RichTextEditor.module.scss";
import {
  EditorProvider,
  type EditorProviderProps,
  useCurrentEditor,
} from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import React from "react";
import { Button, ButtonGroup, ButtonToolbar } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBold, faItalic } from "@fortawesome/free-solid-svg-icons";

const Toolbar: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <ButtonToolbar
      className={styles.toolbar}
      aria-label="Rich-Text Editor Toolbar"
    >
      <ButtonGroup size="sm">
        <Button
          variant="default"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          aria-label="Bold"
        >
          {/* TODO: Fix having to explicitly set height and width for document renderer */}
          <FontAwesomeIcon icon={faBold} />
        </Button>
        <Button
          variant="default"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          aria-label="Italic"
        >
          <FontAwesomeIcon icon={faItalic} />
        </Button>
      </ButtonGroup>
    </ButtonToolbar>
  );
};

const RichTextEditor: React.FunctionComponent<EditorProviderProps> = (
  props: EditorProviderProps,
) => (
  <div className={styles.root}>
    <EditorProvider
      extensions={[StarterKit]}
      slotBefore={<Toolbar />}
      {...props}
    />
  </div>
);

export default RichTextEditor;
