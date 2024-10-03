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
  MOD_ACTIVATION: "mod activation",
  EXTENSION_CONSOLE: "extension console",
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
}

/**
 * Map of Mixpanel event names to Lexicon event entries.
 */
type LexiconMap = {
  [K in keyof typeof Events]: LexiconEventEntry;
};

// @ts-expect-error -- TODO: Remove this when the Lexicon is fully implemented https://github.com/pixiebrix/pixiebrix-extension/issues/9151
export const lexicon: LexiconMap = {
  ACTIVATION_INTEGRATION_CONFIG_SELECT: {
    description:
      "Reported on the mod activation page in the Extension Console when a user selects an option in the dropdown menu " +
      "to configure an integration for the mod. This includes when a new integration is auto-filled after creating " +
      "the integration via the '+ Add new' option.",
    tags: [LexiconTags.MOD_ACTIVATION, LexiconTags.EXTENSION_CONSOLE],
  },
  ACTIVATION_INTEGRATION_REFRESH: {
    description:
      "Reported on the mod activation page in the Extension Console when a user clicks the integration 'Refresh' button to " +
      "refresh the list of available integrations.",
    tags: [LexiconTags.MOD_ACTIVATION, LexiconTags.EXTENSION_CONSOLE],
  },
  ACTIVATION_INTEGRATION_ADD_NEW_CLICK: {
    description:
      "Reported on the mod activation page in the Extension Console when a user selects the '+ Add new' option to " +
      "create a new integration configuration for the mod. A modal should appear for the user to create the configuration, " +
      "but this event is triggered specifically when '+ Add new' option is clicked.",
    tags: [LexiconTags.MOD_ACTIVATION, LexiconTags.EXTENSION_CONSOLE],
  },
  ACTIVATION_INTEGRATION_ADD_NEW_CLOSE: {
    description:
      "Reported on the mod activation page in the Extension Console when a user closes the modal for creating a new " +
      "integration configuration for the mod (either by clicking 'Cancel', 'Save' or 'X' in the modal).",
    tags: [LexiconTags.MOD_ACTIVATION, LexiconTags.EXTENSION_CONSOLE],
  },
  BRICK_ADD: {
    description:
      'Triggered when a user successfully adds a brick to a Mod in the Page Editor via clicking "Add" or "Add brick" in the Add Brick modal.',
    tags: [LexiconTags.PAGE_EDITOR],
  },
  BRICK_COMMENTS_UPDATE: {
    description:
      "Triggered when a user updates the brick comment in the Data Panel 'comments' tab in the Page Editor. More specifically," +
      "when a user modifies the comment and leaves the field.",
    tags: [LexiconTags.PAGE_EDITOR],
  },
};

/**
 * Converts an Events key to capitalized camel case, for use with updating the display name for events.
 * @param key A valid key of the Events object
 * @returns The key in capitalized camel case format
 */
function convertEventKeyToCapitalizedCamelCase(
  key: keyof typeof Events,
): string {
  return key
    .toLowerCase()
    .split("_")
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

/**
 * Returns a display name for the given event if needed (i.e. the new event name different from the original event name).
 * @param key A valid key of the Events object
 * @returns a capitalized camel case string representing the display name for the event, or null if
 * a display name is not needed.
 */
function getDisplayName(key: keyof typeof Events) {
  const newEventName = convertEventKeyToCapitalizedCamelCase(key);
  // eslint-disable-next-line security/detect-object-injection -- eventKey is a constant
  return newEventName === Events[key] ? null : newEventName;
}

/**
 * Transforms a LexiconMap into a JSON schema that can be used in the request body to upload the Lexicon to Mixpanel.
 * See expected shape here https://developer.mixpanel.com/reference/upload-schemas-for-project
 */
export function transformLexiconMapToRequestSchema(
  lexiconMap: LexiconMap,
): JSONSchema {
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
            displayName: getDisplayName(eventKey),
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
