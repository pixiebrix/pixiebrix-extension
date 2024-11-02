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
import cx from "classnames";
import MarkdownLazy from "@/components/Markdown";

type FormPreviewDescriptionFieldProps = {
  id: string;
  description: string | React.ReactElement;
  className?: string;
};

const DescriptionFieldTemplate: React.FC<FormPreviewDescriptionFieldProps> = ({
  id,
  description,
  className,
}) => {
  if (!description) {
    return null;
  }

  return (
    <div id={id} className={cx("mb-3", className)}>
      {typeof description === "string" ? (
        <MarkdownLazy markdown={description} />
      ) : (
        { description }
      )}
    </div>
  );
};

export default DescriptionFieldTemplate;
