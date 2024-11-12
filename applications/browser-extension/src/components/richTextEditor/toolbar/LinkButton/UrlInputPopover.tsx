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

import React, { type Dispatch, type SetStateAction } from "react";
import LinkEditForm from "@/components/richTextEditor/toolbar/LinkButton/LinkEditForm";
import LinkPreviewActions from "@/components/richTextEditor/toolbar/LinkButton/LinkPreviewActions";
import {
  type PopoverState,
  POPOVER_VIEW,
} from "@/components/richTextEditor/toolbar/LinkButton/types";
import { assertNotNullish } from "@/utils/nullishUtils";
import { useCurrentEditor } from "@tiptap/react";

const UrlInputPopover = ({
  setPopoverState,
  popoverView,
}: {
  setPopoverState: Dispatch<SetStateAction<PopoverState>>;
  popoverView: PopoverState["popoverView"];
}) => {
  const { editor } = useCurrentEditor();
  assertNotNullish(editor, "Tiptap editor must be in scope");

  switch (popoverView) {
    case POPOVER_VIEW.linkPreview: {
      return (
        <LinkPreviewActions
          href={editor.getAttributes("link").href as string}
          onEdit={() => {
            setPopoverState({
              showPopover: true,
              popoverView: POPOVER_VIEW.editForm,
            });
          }}
          onRemove={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            setPopoverState({
              showPopover: false,
              popoverView: POPOVER_VIEW.linkPreview,
            });
          }}
        />
      );
    }

    case POPOVER_VIEW.editForm: {
      return (
        <LinkEditForm
          initialHref={(editor.getAttributes("link").href as string) ?? ""}
          setPopoverState={setPopoverState}
        />
      );
    }

    default: {
      return null;
    }
  }
};

export default UrlInputPopover;
