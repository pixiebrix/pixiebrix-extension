/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import createDOMPurify, { type Config, type DOMPurifyI } from "dompurify";
import { type SafeHTML } from "@/types/stringTypes";

let DOMPurify: DOMPurifyI;

/**
 * Assume that the given HTML is safe by applying the SafeHTML type brand.
 * @param html the HTML string
 */
export function assumeSafe(html: string): SafeHTML {
  return html as SafeHTML;
}

/**
 * Sanitize the given HTML string.
 *
 * https://github.com/cure53/DOMPurify?tab=readme-ov-file#can-i-configure-dompurify
 *
 * @param html
 * @param config the DOMPurify config
 */
function sanitize(html: string, config?: Config): SafeHTML {
  if (!DOMPurify) {
    DOMPurify = createDOMPurify(window);
  }

  return DOMPurify.sanitize(html, config ?? {}) as SafeHTML;
}

export default sanitize;
