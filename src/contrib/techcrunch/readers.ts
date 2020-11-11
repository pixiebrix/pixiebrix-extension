/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Reader } from "@/types";
import startCase from "lodash/startCase";
import { registerBlock } from "@/blocks/registry";
import trim from "lodash/trim";
import { ReaderOutput, Schema } from "@/core";

type EntityType = "person" | "organization";

function cleanText(text: string): string {
  const result = trim(text);
  if (result.endsWith("'s") || result.endsWith("’s")) {
    return result.slice(0, -2);
  } else if (result.endsWith("'") || result.endsWith("’")) {
    return result.slice(0, -1);
  } else {
    return result;
  }
}

class MentionReader extends Reader {
  entityType: EntityType;

  constructor(entityType: EntityType) {
    super(
      `techcrunch/${entityType}-mention`,
      `TechCrunch ${startCase(entityType)} Mention Reader`
    );
    this.entityType = entityType;
  }

  outputSchema: Schema = {
    type: "object",
    properties: {
      name: {
        type: "string",
      },
      crunchbaseUrl: {
        type: "string",
        format: "uri",
      },
      entity: {
        type: "string",
      },
      articleUrl: {
        type: "string",
        format: "uri",
      },
    },
    required: ["name", "crunchbaseUrl", "entity", "articleUrl"],
  };

  async isAvailable($elt: JQuery): Promise<boolean> {
    return $elt.data("type") === this.entityType;
  }

  async read(elt: HTMLElement): Promise<ReaderOutput> {
    const $elt = $(elt);
    return {
      articleUrl: window.location.href,
      crunchbaseUrl: $elt.attr("href"),
      name: cleanText($elt.text()),
      entity: $elt.data("entity"),
    };
  }
}

export const PERSON_MENTION_READER = new MentionReader("person");
export const ORGANIZATION_MENTION_READER = new MentionReader("organization");

registerBlock(ORGANIZATION_MENTION_READER);
registerBlock(PERSON_MENTION_READER);
