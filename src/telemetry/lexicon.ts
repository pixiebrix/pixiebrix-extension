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

import { type JSONSchema7 } from "json-schema";
import { Events } from "@/telemetry/events";
import { type ValueOf } from "type-fest";

type LexiconEntry = {
  entityType: "event" | "custom_event";
  name: ValueOf<typeof Events>;
  schemaJson: JSONSchema7 & {
    metadata: {
      "com.mixpanel": {
        displayName: string;
        dropped: boolean;
        hidden: boolean;
        tags: string[];
        platforms: string[];
      };
    };
  };
};

type CompleteLexiconMap = {
  [K in ValueOf<typeof Events>]: LexiconEntry;
};

const LexiconMap: CompleteLexiconMap = {
  [Events.MOD_ACTIVATE]: {
    entityType: "event",
    name: Events.MOD_ACTIVATE,
    schemaJson: {
      $schema: "http://json-schema.org/draft-07/schema",
      description:
        "Triggered when a mod is successfully activated via the Activate Wizard or via in-Marketplace Activation.\n\n`StarterBrickActivate` will often be reported along with this event (starter bricks are activated in the process of activating the mod).",
      metadata: {
        "com.mixpanel": {
          displayName: "ModActivate",
          dropped: false,
          hidden: false,
          platforms: [],
          tags: ["mod activation"],
        },
      },
      properties: {},
      additionalProperties: true,
      required: [],
    },
  },
};
