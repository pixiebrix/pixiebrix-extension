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

import { set } from "lodash";
import { describeTable, ParsedTable, TableRecord } from "./parseDomTable";

/** Normalized data extracted from definition list */
interface NormalizedItem {
  terms: string[];
  definitions: string[];
}

function flattenListContent(list: HTMLDListElement): NormalizedItem[] {
  const flattened: NormalizedItem[] = [];
  let current: NormalizedItem;

  // This boolean marks the `dd -> dt` sequence, where the old definition ends
  // and a new term is found. This allows `dt, dt, dd, dd` sequences which are
  // for a single term group, like:
  // Terms: hi, hello
  // Definitions: excl. to begin a conversation, excl. to attract someone's attention
  let dtStartsNewGroup = true;
  for (const element of list.querySelectorAll("dt, dd")) {
    if (element.tagName === "DT") {
      if (dtStartsNewGroup) {
        dtStartsNewGroup = false;
        current = {
          terms: [],
          definitions: [],
        };
        flattened.push(current);
      }

      current.terms.push(element.textContent.trim());
    } else if (element.tagName === "DD") {
      dtStartsNewGroup = true;
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
      set(record, term, definitions.join("\n"));
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
