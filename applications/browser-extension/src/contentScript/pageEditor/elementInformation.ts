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

import { uniqBy } from "lodash";
import { type AttributeExample } from "@/contentScript/pageEditor/types";

import { $safeFind } from "@/utils/domUtils";

/**
 * Returns attributes available an _any_ of the elements matching the selector. Returns the first example per attribute.
 * @param selector the selector to query
 */
export function getAttributeExamples(selector: string): AttributeExample[] {
  console.debug("getAttributeExamples", { selector });

  const elements = $safeFind(selector).get();

  const examples = elements.flatMap((element) => {
    const examples = [];

    for (const attribute of element.attributes) {
      examples.push({
        name: attribute.name,
        value: attribute.value,
      });
    }

    return examples;
  });

  return uniqBy(examples, (example) => example.name);
}
