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
import { useCurrentEditor } from "@tiptap/react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { assertNotNullish } from "@/utils/nullishUtils";
import useUploadAsset from "@/components/richTextEditor/toolbar/ImageButton/useUploadAsset";

const ImageButton: React.FunctionComponent = () => {
  const uploadAsset = useUploadAsset();
  const { editor } = useCurrentEditor();
  assertNotNullish(
    editor,
    "ImageButton must be used within a TipTap editor context",
  );

  return (
    <Button
      variant="default"
      onClick={() => {
        uploadAsset();
      }}
      disabled={
        editor.isEditable
          ? !editor.can().chain().focus().setImage({ src: "url" }).run()
          : true
      }
      active={editor.isActive("bold")}
      aria-label="Insert Image"
    >
      <FontAwesomeIcon icon={faImage} />
    </Button>
  );
};

export default ImageButton;
