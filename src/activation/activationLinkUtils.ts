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
import type { ModActivationConfig } from "@/types/modTypes";
import { isEmpty, uniq } from "lodash";
import deepEquals from "fast-deep-equal";
import { base64ToString, stringToBase64 } from "uint8array-extras";
import { isPixieBrixDomain } from "@/utils/urlUtils";

const ACTIVATE_PATH = "/activate";

/**
 * Returns an absolute URL for activating mods.
 * @param mods the mods to activate
 * @param nextUrl optional redirect URL
 * @param baseUrl optional base URL, defaults to DEFAULT_SERVICE_URL
 *
 * @see createActivationRelativeUrl
 * @see DEFAULT_SERVICE_URL
 */
export function createActivationUrl(
  mods: ModActivationConfig[],
  {
    nextUrl,
    baseUrl = DEFAULT_SERVICE_URL,
  }: {
    nextUrl?: string;
    baseUrl?: string;
  } = {},
) {
  return new URL(createActivationRelativeUrl(mods, { nextUrl }), baseUrl);
}

/**
 * Returns a relative URL for activating mods.
 * @param mods the mods to activate
 * @param nextUrl an optional redirect URL
 * @internal
 */
export function createActivationRelativeUrl(
  mods: ModActivationConfig[],
  {
    nextUrl,
  }: {
    nextUrl?: string;
  } = {},
): string {
  const [firstMod] = mods;
  if (!firstMod) {
    throw new Error("Expected at least one mod to activate");
  }

  const searchParams = new URLSearchParams();

  const { initialOptions } = firstMod;

  // In 1.8.8, which introduces initial options, we only support a single set of initial options
  if (mods.some((mod) => !deepEquals(mod.initialOptions, initialOptions))) {
    throw new Error("Expected all mods to have the same initial options");
  }

  for (const mod of mods) {
    // `id[]` syntax works in mod component both single and multiple values
    searchParams.append("id[]", mod.modId);
  }

  // Only add options if they are present
  if (mods.some((x) => !isEmpty(x.initialOptions))) {
    searchParams.set(
      "activateOptions",
      stringToBase64(JSON.stringify(initialOptions)),
    );
  }

  if (nextUrl) {
    searchParams.set("nextUrl", nextUrl);
  }

  // App UI doesn't use trailing slashes
  return `${ACTIVATE_PATH}?${searchParams.toString()}`;
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

  return uniq(rawIds.filter((x) => isRegistryId(x)));
}

export function getNextUrlFromActivateUrl(
  activateUrl: string,
): Nullishable<string> {
  const url = new URL(activateUrl);
  const nextUrl = url.searchParams.get("nextUrl");
  if (isPixieBrixDomain(nextUrl)) {
    return nextUrl;
  }

  return null;
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

  const json = JSON.parse(base64ToString(encodedOptions));

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
 */
export function parseModActivationUrlSearchParams(
  searchParams: URLSearchParams,
): ModActivationConfig[] {
  const modIds = getRegistryIdsFromActivateUrlSearchParams(searchParams);
  const encodedOptions = searchParams.get("activateOptions") as EncodedJSON;
  const initialOptions = parseEncodedOptions(encodedOptions);
  // NOTE: currently applying same options to all mods
  return modIds.map((modId) => ({ modId, initialOptions }));
}
