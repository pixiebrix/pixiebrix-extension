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

import { useAsyncState } from "@/hooks/common";
import safeMarkdown from "@/utils/safeMarkdown";
import React from "react";

type MarkdownProps = {
  markdown: string;
  as?: React.ElementType;
};

const Markdown: React.FunctionComponent<MarkdownProps> = ({
  markdown,
  as: As = "div",
}) => {
  const [content] = useAsyncState(async () => {
    if (typeof markdown === "string") {
      return safeMarkdown(markdown);
    }

    return markdown;
  }, [markdown]);

  if (!markdown) {
    return null;
  }

  return <As dangerouslySetInnerHTML={{ __html: content }} />;
};

export default Markdown;
