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

import { readStorage } from "@/chrome";
import BaseRegistry from "@/baseRegistry";
import { fromJS } from "@/services/factory";
import { RawServiceConfiguration } from "@/core";

export const PIXIEBRIX_SERVICE_ID = "@pixiebrix/api";

const storageKey = "persist:servicesOptions";

const registry = new BaseRegistry(["service"], "services", fromJS);

export async function readRawConfigurations(): Promise<
  RawServiceConfiguration[]
> {
  const rawConfigs = await readStorage(storageKey);

  if (!rawConfigs) {
    return [];
  }

  // Not really sure why the next level down is escaped JSON?
  const base = JSON.parse(rawConfigs as string);
  const configured = JSON.parse(base.configured);
  return Array.from(Object.values(configured)) as RawServiceConfiguration[];
}

export default registry;
