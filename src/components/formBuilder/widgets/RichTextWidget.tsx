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
import { type WidgetProps } from "@rjsf/utils";
import { useCurrentEditor, EditorProvider } from "@tiptap/react";
// TODO: Only install the extensions we need
import { StarterKit } from "@tiptap/starter-kit";
import { type Level } from "@tiptap/extension-heading";
import { Button, ButtonGroup, ButtonToolbar } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBold, faItalic } from "@fortawesome/free-solid-svg-icons";
import styles from "./RichTextWidget.module.scss";
import Select from "react-select";
import { type Option } from "@/components/form/widgets/SelectWidget";

const Toolbar: React.FunctionComponent = () => {
  const { editor } = useCurrentEditor();

  const headingOptions: Array<
    Option<{ name: "paragraph" } | { name: "heading"; level: Level }>
  > = [
    {
      value: { name: "paragraph" },
      label: "Paragraph",
    },
    {
      value: { name: "heading", level: 1 },
      label: "Heading 1",
    },
    {
      value: { name: "heading", level: 2 },
      label: "Heading 2",
    },
    {
      value: { name: "heading", level: 3 },
      label: "Heading 3",
    },
  ];

  if (!editor) {
    return null;
  }

  return (
    <ButtonToolbar className={styles.toolbar}>
      <ButtonGroup size="sm" aria-label="Rich-Text Editor Toolbar">
        <ButtonGroup>
          <Select
            className={styles.dropdown}
            value={{
              value: {
                name: editor.isActive("heading") ? "heading" : "paragraph",
                level: editor.isActive("heading")
                  ? editor.getAttributes("heading").level
                  : undefined,
              },
              label: editor.isActive("heading")
                ? `Heading ${editor.getAttributes("heading").level}`
                : "Paragraph",
            }}
            onChange={(
              selectedOption: Option<
                { name: "paragraph" } | { name: "heading"; level: Level }
              >,
            ) => {
              switch (selectedOption.value.name) {
                case "paragraph": {
                  editor.chain().focus().setParagraph().run();
                  break;
                }

                case "heading": {
                  const { level } = selectedOption.value;
                  editor.chain().focus().setHeading({ level }).run();
                  break;
                }

                default: {
                  break;
                }
              }
            }}
            options={headingOptions}
          />
        </ButtonGroup>
        <Button
          variant="default"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          {/* TODO: Fix having to explicitly set height and width for document renderer */}
          <FontAwesomeIcon icon={faBold} height="16" width="16" />
        </Button>
        <Button
          variant="default"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <FontAwesomeIcon icon={faItalic} height="16" width="16" />
        </Button>
      </ButtonGroup>
    </ButtonToolbar>
  );
};

const RichTextWidget: React.FunctionComponent<WidgetProps> = () => (
  <div className={styles.root}>
    <EditorProvider
      extensions={[StarterKit]}
      content="<p>Hello TipTap! 🍌</p>"
      slotBefore={<Toolbar />}
    />
  </div>
);

export default RichTextWidget;
