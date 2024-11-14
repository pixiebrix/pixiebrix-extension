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
import { EditorProvider, type EditorProviderProps } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image, type ImageOptions } from "@tiptap/extension-image";
import React, { useState } from "react";
import Toolbar from "@/components/richTextEditor/toolbar/Toolbar";
import { type UUID } from "@/types/stringTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import ErrorContext from "@/components/richTextEditor/ErrorContext";

type EditorProps = EditorProviderProps & {
  // A PixieBrix asset database ID to use for uploading images. If not included, the image extension will be disabled.
  assetDatabaseId?: UUID;
};

interface ImageWithAssetDatabaseOptions extends ImageOptions {
  assetDatabaseId: UUID | null;
}

const RichTextEditor: React.FunctionComponent<EditorProps> = ({
  assetDatabaseId,
  ...props
}: EditorProps) => {
  const [error, setError] = useState<string | null>(null);

  return (
    <ErrorContext.Provider value={{ error, setError }}>
      <div className={styles.root}>
        <EditorProvider
          extensions={[
            StarterKit,
            Underline,
            Link.extend({ inclusive: false }).configure({ openOnClick: false }),
            ...(assetDatabaseId
              ? [
                  Image.extend<ImageWithAssetDatabaseOptions>({
                    addOptions() {
                      return {
                        ...this.parent?.(),
                        assetDatabaseId: null,
                      };
                    },
                  }).configure({
                    assetDatabaseId,
                    inline: true,
                    HTMLAttributes: { style: "max-width: 100%" },
                  }),
                ]
              : []),
          ]}
          slotBefore={<Toolbar />}
          slotAfter={
            error && (
              <div className={styles.error}>
                <FontAwesomeIcon icon={faExclamationCircle} /> {error}
              </div>
            )
          }
          {...props}
        />
      </div>
    </ErrorContext.Provider>
  );
};

export default RichTextEditor;
