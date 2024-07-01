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

export function isMac(): boolean {
  // https://stackoverflow.com/a/27862868/402560
  return globalThis.navigator?.platform.includes("Mac");
}

// https://github.com/google/closure-library/blob/master/closure/goog/labs/useragent/browser.js#L87
// https://learn.microsoft.com/en-us/microsoft-edge/web-platform/user-agent-guidance
// https://caniuse.com/mdn-api_navigator_useragentdata -- not defined for Firefox/Safari
// eslint-disable-next-line local-rules/persistBackgroundData, @typescript-eslint/no-unsafe-assignment -- userAgentData is defined in Chrome
const brands: Array<{ brand: string }> =
  // @ts-expect-error -- userAgentData is defined in Chrome browser
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- userAgentData is defined in Chrome
  globalThis.navigator?.userAgentData?.brands ?? [];

/**
 * Return true if the browser is Google Chrome.
 *
 * Unlike webext-detect, attempts to exclude other Chromium-based browsers like Microsoft Edge, Brave, and Opera.
 */
export function isGoogleChrome(): boolean {
  return brands.some((x) => x.brand === "Google Chrome");
}

export function isMicrosoftEdge(): boolean {
  return brands.some((x) => x.brand === "Microsoft Edge");
}
