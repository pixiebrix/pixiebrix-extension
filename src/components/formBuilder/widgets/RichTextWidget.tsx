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
import { Editor } from "@tinymce/tinymce-react";
/* eslint-disable import/no-unassigned-import -- required imports for tinymce */
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin";
/* eslint-enable import/no-unassigned-import */

const RichTextWidget: React.FunctionComponent<WidgetProps> = () => (
  <Editor
    initialValue="<p>Hello TinyMCE! 🍌</p>"
    init={{
      height: 200,
      menubar: false,
      elementpath: false,
      branding: false,
      plugins: [],
      toolbar: "bold italic underline",
      content_style: "body { font-size:16px }",
    }}
  />
);

export default RichTextWidget;
