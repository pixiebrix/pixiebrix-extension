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

import { describeTable, ParsedTable, TableRecord } from "./parseDomTable";

/** Normalized data extracted from definition list */
interface NormalizedItem {
  terms: string[];
  definitions: string[];
}

function flattenListContent(list: HTMLDListElement): NormalizedItem[] {
  const flattened: NormalizedItem[] = [];
  let current: NormalizedItem;
  let seenDefinition = true;
  for (const element of list.querySelectorAll("dt, dd")) {
    if (element.tagName === "DT") {
      if (seenDefinition) {
        seenDefinition = false;
        current = {
          terms: [],
          definitions: [],
        };
        flattened.push(current);
      }

      current.terms.push(element.textContent.trim());
    } else if (element.tagName === "DD") {
      seenDefinition = true;
      current.definitions.push(element.textContent.trim());
    }
  }

  return flattened;
}

export function parseDefinitionList(list: HTMLDListElement): ParsedTable {
  // Lists are monodimensional, there can only be one record
  const record: TableRecord = {};

  for (const { terms, definitions } of flattenListContent(list)) {
    for (const term of terms) {
      // TODO: Possible injection with `<dt>__proto__</dt>`
      record[term] = definitions.join("\n");
    }
  }

  return {
    fieldNames: Object.keys(record),
    records: [record],
  };
}

export function getAllDefinitionLists(
  root: HTMLElement | Document = document
): Map<string, ParsedTable> {
  const tables = new Map();
  for (const table of $<HTMLDListElement>("dl", root)) {
    const parsedTable = parseDefinitionList(table);

    tables.set(describeTable(table, parsedTable), parsedTable);
  }

  return tables;
}
