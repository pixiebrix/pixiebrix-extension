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

import React, { type Dispatch, type SetStateAction, useCallback } from "react";
import {
  type PopoverState,
  POPOVER_VIEW,
} from "@/components/richTextEditor/toolbar/LinkButton/types";
import { assertNotNullish } from "@/utils/nullishUtils";
import { useCurrentEditor } from "@tiptap/react";
// eslint-disable-next-line no-restricted-imports -- Not a schema-driven form
import { Formik } from "formik";
// eslint-disable-next-line no-restricted-imports -- Not a schema-driven form
import { Form, Button } from "react-bootstrap";

const LinkEditForm: React.FC<{
  initialHref: string;
  setPopoverState: Dispatch<SetStateAction<PopoverState>>;
}> = ({ initialHref, setPopoverState }) => {
  const { editor } = useCurrentEditor();
  assertNotNullish(editor, "Tiptap editor must be in scope");

  const onSubmit = useCallback(
    (url: string) => {
      if (!url || url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
      }

      setPopoverState({
        showPopover: false,
        popoverView: POPOVER_VIEW.editForm,
      });
    },
    [editor, setPopoverState],
  );

  return (
    <Formik
      initialValues={{ newUrl: initialHref }}
      onSubmit={(values) => {
        onSubmit(values.newUrl);
      }}
    >
      {({ handleSubmit, handleChange, handleBlur, values }) => (
        <Form inline onSubmit={handleSubmit}>
          <Form.Label htmlFor="newUrl">Enter link:</Form.Label>
          <Form.Control
            id="newUrl"
            name="newUrl"
            size="sm"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.newUrl}
          />
          <Button variant="link" type="submit" size="sm">
            Submit
          </Button>
        </Form>
      )}
    </Formik>
  );
};

export default LinkEditForm;
