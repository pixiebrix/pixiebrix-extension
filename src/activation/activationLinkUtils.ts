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

import type { EncodedJSON } from "@/types/stringTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import type { JsonObject } from "type-fest";
import type { RegistryId } from "@/types/registryTypes";
import { isRegistryId } from "@/types/helpers";
import { DEFAULT_SERVICE_URL } from "@/urlConstants";
import type { ModOptionsPair } from "@/types/modTypes";
import { uniq } from "lodash";

const ACTIVATE_PATH = "/activate";

/**
 * Create a mod activation URL. Handles URL encoding.
 * @param modIds
 */
export function createActivationUrl(modIds: RegistryId[]): URL {
  const url = new URL(`${DEFAULT_SERVICE_URL}${ACTIVATE_PATH}`);

  if (modIds.length === 1) {
    // Known not to be undefined due to length check
    url.searchParams.append("id", modIds[0] as string);
    return url;
  }

  for (const modId of modIds) {
    url.searchParams.append("id[]", modId);
  }

  return url;
}

/**
 * Returns true if the URL is an activation URL. Does NOT validate the URL parameters.
 * @param maybeActivationUrl the value to check
 */
export function isActivationUrl(maybeActivationUrl: string): boolean {
  try {
    const url = new URL(maybeActivationUrl);
    return url.origin === DEFAULT_SERVICE_URL && url.pathname === ACTIVATE_PATH;
  } catch {
    return false;
  }
}

/**
 * Read valid registry ids from an activation URL's search params. Handles both `id` and `id[]`.
 * @param searchParams the activation URL search params
 */
export function getRegistryIdsFromActivateUrlSearchParams(
  searchParams: URLSearchParams,
): RegistryId[] {
  const rawIds = [...searchParams.getAll("id"), ...searchParams.getAll("id[]")];

  return uniq(rawIds.filter((x) => isRegistryId(x)) as RegistryId[]);
}

export function getNextUrlFromActivateUrl(
  activateUrl: string,
): Nullishable<string> {
  const url = new URL(activateUrl);
  return url.searchParams.get("nextUrl");
}

/**
 * Parse base64 encoded mod option configuration.
 * @param encodedOptions the base64 encoded options
 */
function parseEncodedOptions(
  encodedOptions: Nullishable<EncodedJSON>,
): JsonObject {
  if (!encodedOptions) {
    return {};
  }

  const json = JSON.parse(atob(encodedOptions));

  if (typeof json !== "object") {
    throw new TypeError(`Invalid options: ${typeof json}`);
  }

  if (Array.isArray(json)) {
    throw new TypeError("Invalid options: array");
  }

  // @ts-expect-error -- typescript thinks it can be a JsonObject | readonly JsonValue[] for some reason
  return json ?? {};
}

/**
 * Parse a mod activation URL into an array of mod ids and initial options.
 * @param searchParams the activation URL search params
 */
export function parseModActivationUrlSearchParams(
  searchParams: URLSearchParams,
): ModOptionsPair[] {
  const modIds = getRegistryIdsFromActivateUrlSearchParams(searchParams);
  const encodedOptions = searchParams.get("activateOptions") as EncodedJSON;
  const initialOptions = parseEncodedOptions(encodedOptions);
  // NOTE: currently applying same options to all mods
  return modIds.map((modId) => ({ modId, initialOptions }));
}
