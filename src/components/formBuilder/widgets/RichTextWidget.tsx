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
import RichTextEditor from "@/components/richTextEditor/RichTextEditor";
import { type Editor } from "@tiptap/react";

const getEditorValue = (editor: Editor) =>
  // TipTap will return an empty html tag if the editor has been cleared
  editor.isEmpty ? undefined : editor.getHTML();

const RichTextWidget: React.FunctionComponent<WidgetProps> = ({
  id,
  onChange,
  onFocus,
  onBlur,
  disabled,
  readonly,
}) => (
  <RichTextEditor
    onUpdate={({ editor }) => {
      onChange(getEditorValue(editor));
    }}
    onFocus={({ editor }) => {
      editor.commands.focus();
      onFocus(id, getEditorValue(editor));
    }}
    onBlur={({ editor }) => {
      onBlur(id, getEditorValue(editor));
    }}
    editable={!(disabled || readonly)}
  />
);

export default RichTextWidget;
