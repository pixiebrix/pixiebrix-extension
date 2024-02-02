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

import { isEmpty } from "lodash";
import type { EncodedJSON } from "@/types/stringTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import type { JsonObject } from "type-fest";
import type { RegistryId } from "@/types/registryTypes";

const SERVICE_ORIGIN = "https://app.pixiebrix.com";
const ACTIVATE_PATH = "/activate";

/**
 * Construct a mod activation URL. Handles URL encoding.
 * @param modIds
 */
export function constructActivationUrl(modIds: RegistryId[]): URL {
  const url = new URL(`${SERVICE_ORIGIN}${ACTIVATE_PATH}`);

  if (modIds.length === 1) {
    url.searchParams.append("id", modIds[0]);
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
    return url.origin === SERVICE_ORIGIN && url.pathname === ACTIVATE_PATH;
  } catch {
    return false;
  }
}

/**
 * Read id search params from the URL. Handles both `id` and `id[]`.
 * @param url
 */
export function readIdsFromUrl(url: URL): string[] {
  const rawIds = [
    ...url.searchParams.getAll("id"),
    ...url.searchParams.getAll("id[]"),
  ];
  return rawIds.filter((x) => !isEmpty(x));
}

export function getNextUrlFromActivateUrl(activateUrl: string): string | null {
  const url = new URL(activateUrl);
  return url.searchParams.get("nextUrl");
}

export function getEncodedOptionsFromActivateUrl(
  activateUrl: string,
): EncodedJSON | null {
  const url = new URL(activateUrl);
  return url.searchParams.get("activateOptions") as EncodedJSON;
}

/**
 * Parse base64 encoded mod option configuration.
 * @param encodedOptions the base64 encoded options
 */
export function parseEncodedOptions(
  encodedOptions: Nullishable<EncodedJSON>,
): JsonObject {
  if (!encodedOptions) {
    return {};
  }

  const json = JSON.parse(btoa(encodedOptions));

  if (typeof json !== "object") {
    throw new TypeError(`Invalid options: ${typeof json}`);
  }

  if (Array.isArray(json)) {
    throw new TypeError("Invalid options: array");
  }

  // @ts-expect-error -- typescript thinks it can be a JsonObject | readonly JsonValue[] for some reason
  return json ?? {};
}
