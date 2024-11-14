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

import React, { useState } from "react";
import { type Editor, useCurrentEditor } from "@tiptap/react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { assertNotNullish } from "@/utils/nullishUtils";
import { validateUUID } from "@/types/helpers";
import { useShowError } from "@/components/richTextEditor/ErrorContext";
import { useUploadAssetMutation } from "@/data/service/api";

const getAssetDatabaseId = (editor: Editor) => {
  const imageExtension = editor.options.extensions.find(
    (extension) => extension.name === "image",
  );

  if (!imageExtension?.options.assetDatabaseId) {
    return null;
  }

  return validateUUID(imageExtension.options.assetDatabaseId);
};

const ImageButton: React.FunctionComponent = () => {
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [uploadAsset] = useUploadAssetMutation();
  const { editor } = useCurrentEditor();
  const { setError } = useShowError();

  assertNotNullish(
    editor,
    "ImageButton must be used within a TipTap editor context",
  );

  const assetDatabaseId = getAssetDatabaseId(editor);
  if (!assetDatabaseId) {
    return null;
  }

  const openFilePicker = async () => {
    setIsFilePickerOpen(true);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg, image/gif";

    const handleFileSelection = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        setIsFilePickerOpen(false);
        return;
      }

      try {
        const downloadUrl = await uploadAsset({
          databaseId: assetDatabaseId,
          file,
        }).unwrap();
        editor
          .chain()
          .focus()
          .setImage({ src: downloadUrl.href, alt: "" })
          .run();
      } catch (error) {
        setError("Failed to upload image, try again");
        reportError(
          new Error("Failed to upload image asset", {
            cause: error,
          }),
        );
      } finally {
        setIsFilePickerOpen(false);
      }
    };

    input.addEventListener("change", handleFileSelection);
    input.addEventListener("cancel", () => {
      setIsFilePickerOpen(false);
    });

    input.click();
    input.remove();
  };

  return (
    <Button
      variant="default"
      onClick={openFilePicker}
      disabled={
        isFilePickerOpen ||
        (editor.isEditable
          ? !editor.can().chain().focus().setImage({ src: "" }).run()
          : true)
      }
      aria-label="Insert Image"
    >
      <FontAwesomeIcon icon={faImage} />
    </Button>
  );
};

export default ImageButton;
