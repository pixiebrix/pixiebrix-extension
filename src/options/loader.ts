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

import { Metadata, ServiceDependency } from "@/core";
import { Permissions, browser } from "webextension-polyfill-ts";
import { Primitive } from "type-fest";

const STORAGE_KEY = "persist:extensionOptions";
const INITIAL_STATE = JSON.stringify({});

export interface ExtensionOptions {
  id: string;
  _recipeId?: string;
  _recipe: Metadata | null;
  _deployment?: {
    id: string;
    timestamp: string;
  };
  extensionPointId: string;
  active: boolean;
  label: string;
  permissions?: Permissions.Permissions;
  services: ServiceDependency[];
  optionsArgs?: Record<string, Primitive>;
  config: { [prop: string]: unknown };
}

type ExtensionOptionState = {
  extensions: Record<string, Record<string, ExtensionOptions>>;
};

type JSONString = string;
type RawOptionsState = Record<string, JSONString>;

async function getOptionsState(): Promise<RawOptionsState> {
  // eslint-disable-next-line security/detect-object-injection -- constant storage key
  const rawOptions = (await browser.storage.local.get(STORAGE_KEY))[
    STORAGE_KEY
  ];
  return JSON.parse((rawOptions as string) ?? INITIAL_STATE);
}

/**
 * Read extension options from local storage
 */
export async function loadOptions(): Promise<ExtensionOptionState> {
  const base = await getOptionsState();
  // The redux persist layer persists the extensions value as as JSON-string
  return { extensions: JSON.parse(base.extensions) };
}

/**
 * Save extension options to local storage
 */
export async function saveOptions(state: ExtensionOptionState): Promise<void> {
  const base = await getOptionsState();
  await browser.storage.local.set({
    // The redux persist layer persists the extensions value as as JSON-string
    [STORAGE_KEY]: JSON.stringify({
      ...base,
      extensions: JSON.stringify(state.extensions),
    }),
  });
}
