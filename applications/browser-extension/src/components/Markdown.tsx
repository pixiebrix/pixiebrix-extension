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

import React, { useMemo } from "react";
import sanitize from "@/utils/sanitize";
import { marked } from "marked";
import type { Config } from "dompurify";

export type MarkdownProps = {
  markdown: string | null;
  as?: React.ElementType;
  className?: string;
  /**
   * DOMPurify config to use when sanitizing HTML produced by the markdown.
   *
   * https://github.com/cure53/DOMPurify?tab=readme-ov-file#can-i-configure-dompurify
   *
   * @since 1.8.5
   */
  purifyConfig?: Config;
};

const Markdown: React.FunctionComponent<MarkdownProps> = ({
  markdown,
  as: As = "div",
  className,
  purifyConfig,
}) => {
  const content = useMemo(
    () =>
      typeof markdown === "string"
        ? sanitize(String(marked(markdown)), purifyConfig)
        : null,
    [markdown, purifyConfig],
  );

  return (
    <As dangerouslySetInnerHTML={{ __html: content }} className={className} />
  );
};

export default Markdown;
