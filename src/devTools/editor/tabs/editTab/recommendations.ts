/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { ElementType } from "@/devTools/editor/extensionPoints/elementConfig";
import { RegistryId } from "@/core";

type Recommendation = {
  id: RegistryId;
};

export const RECOMMENDED_BRICKS = new Map<ElementType, Recommendation[]>([
  [
    "menuItem",
    [
      { id: "@pixiebrix/browser/open-tab" },
      { id: "@pixiebrix/zapier/push-data" },
      { id: "@pixiebrix/forms/set" },
    ],
  ],
  [
    "trigger",
    [
      { id: "@pixiebrix/google/sheets-append" },
      { id: "@pixiebrix/highlight" },
      { id: "@pixiebrix/zapier/push-data" },
    ],
  ],
  [
    "contextMenu",
    [
      { id: "@pixiebrix/browser/open-tab" },
      { id: "@pixiebrix/zapier/push-data" },
      { id: "slack/simple-message" },
      { id: "@pixiebrix/google/sheets-append" },
    ],
  ],
  [
    "panel",
    [
      { id: "@pixiebrix/property-table" },
      { id: "@pixiebrix/iframe" },
      { id: "@pixiebrix/get" },
    ],
  ],
  [
    "actionPanel",
    [
      { id: "@pixiebrix/property-table" },
      { id: "@pixiebrix/iframe" },
      { id: "@pixiebrix/get" },
    ],
  ],
] as Array<[ElementType, Recommendation[]]>);
