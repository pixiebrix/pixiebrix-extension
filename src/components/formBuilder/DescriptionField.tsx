/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import sanitize from "@/utils/sanitize";
import { Field } from "@rjsf/core";
import cx from "classnames";
import { useAsyncState } from "@/hooks/common";

type FormPreviewDescriptionFieldProps = {
  id: string;
  description: string | React.ReactNode;
  className?: string;
};

// RJSF implementation ref https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/core/src/components/fields/DescriptionField.js
export const DescriptionField: React.VoidFunctionComponent<
  FormPreviewDescriptionFieldProps
> = ({ id, description, className: classNameProp }) => {
  const [content] = useAsyncState(
    async () => {
      if (typeof description === "string") {
        const { marked } = await import(
          /* webpackChunkName: "marked" */ "marked"
        );
        return (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitize(marked(description)),
            }}
          />
        );
      }

      return description;
    },
    [description],
    ""
  );

  if (!description) {
    return null;
  }

  return (
    <div id={id} className={cx("field-description", classNameProp)}>
      {content}
    </div>
  );
};

// Adjusting field type to match RJSF expectations
export default DescriptionField as unknown as Field;
