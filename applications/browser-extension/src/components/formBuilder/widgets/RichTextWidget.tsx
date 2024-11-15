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
import {isUUID} from "@/types/helpers";

const RichTextWidget: React.FunctionComponent<WidgetProps> = ({
  id,
  onChange,
  onFocus,
  onBlur,
  disabled,
  readonly,
  options,
  value
}) => {
  const { database } = options;

  return (
    <RichTextEditor
      onUpdate={({ editor }) => {
        onChange(editor.getHTML());
      }}
      onFocus={({ editor }) => {
        editor.commands.focus();
        onFocus(id, editor.getHTML());
      }}
      onBlur={({ editor }) => {
        onBlur(id, editor.getHTML());
      }}
      editable={!(disabled || readonly)}
      assetDatabaseId={typeof database === "string" && isUUID(database) ? database : null}
      content={typeof value === "string" ? value : ""}
    />
  );
};

export default RichTextWidget;
