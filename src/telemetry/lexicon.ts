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

/**
 * Entry for a single event in the Mixpanel Lexicon, used to communicate the intended use of the event to
 * non-technical stakeholders.
 * See https://docs.mixpanel.com/docs/data-governance/lexicon for more information on the Mixpanel Lexicon and it's
 * intended use.
 */
interface LexiconEventEntry {
  /**
   * Description of the event that displays in the Mixpanel interface. Good descriptions describe what the event is,
   * specifically when and/or where in the UI it's triggered, and what the implications of the event being triggered
   * are (e.g. does clicking a button mean that something was successful? Or does it just represent the click itself?).
   */
  description: string;
  /**
   * Tags to categorize the event in the Mixpanel interface. Typically used to group related events together.
   */
  tags?: LexiconTag[];
  /**
   * Per Mixpanel docs, the name for the event that displays in the Mixpanel interface. If not provided, the event name is used.
   * Typically used to provide a more human-readable name for the event, or to accommodate legacy event names. (For context,
   * event names cannot be changed once they are reported to Mixpanel, but display names can be changed at any time.)
   */
  displayName?: string;
}

/**
 * Map of Mixpanel event names to Lexicon event entries.
 */
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

/**
 * Transforms a LexiconMap into a JSON schema that can be used in the request body to upload the Lexicon to Mixpanel.
 */
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
            displayName: entry.displayName ?? null,
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
