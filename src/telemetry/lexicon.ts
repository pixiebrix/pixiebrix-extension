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

import { type JSONSchema } from "@apidevtools/json-schema-ref-parser/dist/lib/types";
import { Events } from "./events";
import { type ValueOf } from "type-fest";

const LexiconTags = {
  PAGE_EDITOR: "page editor",
} as const;

type LexiconTag = ValueOf<typeof LexiconTags>;

interface LexiconEventEntry {
  description: string;
  tags?: LexiconTag[];
  displayName?: string;
}

type LexiconMap = {
  [K in keyof typeof Events]: LexiconEventEntry;
};

// @ts-expect-error -- TODO: Incrementally add more events to the Lexicon
export const lexicon: LexiconMap = {
  BRICK_ADD: {
    description:
      'Triggered when a user successfully adds a brick to a Mod in the Page Editor via clicking "Add" or "Add brick" in the Add Brick modal.',
    tags: [LexiconTags.PAGE_EDITOR],
  },
};

// Function to transform LexiconMap to Json format for use with the Mixpanel Lexicon API
export function transformLexicon(lexiconMap: LexiconMap): JSONSchema {
  const entries = Object.entries(lexiconMap).map(
    ([eventKey, entry]: [keyof typeof Events, LexiconEventEntry]) => ({
      entityType: "event",
      // eslint-disable-next-line security/detect-object-injection -- eventKey is a constant
      name: Events[eventKey],
      schemaJson: {
        $schema: "http://json-schema.org/draft-07/schema",
        description: entry.description,
        additionalProperties: true,
        metadata: {
          "com.mixpanel": {
            tags: entry.tags,
            ...(entry.displayName && { displayName: entry.displayName }),
            hidden: false,
            dropped: false,
          },
        },
      },
    }),
  );

  return {
    entries,
    truncate: false,
  };
}
