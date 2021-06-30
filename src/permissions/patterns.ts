/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import psl, { ParsedDomain } from "psl";

export const HTTPS_PATTERN = "https://*/*";

// https://developer.chrome.com/docs/extensions/mv3/match_patterns/
// If the scheme is *, then it matches either http or https, and not file, ftp, or urn
export const SITES_PATTERN = "*://*/*";

/**
 * Get domain using Mozilla's public suffix list
 * @see https://publicsuffix.org/
 */
export function getDomain(url: string): string {
  const urlClass = new URL(url);
  const { domain } = psl.parse(urlClass.host.split(":")[0]) as ParsedDomain;
  return domain;
}

export function createSitePattern(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.hostname}/*`;
}

export function createDomainPattern(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//*.${getDomain(url)}/*`;
}

function getPathFromUrl(url: string): string {
  return url.split("?")[0];
}

export function defaultMatchPattern(url: string): string {
  const cleanURL = getPathFromUrl(url);
  console.debug(`Clean URL: ${cleanURL}`);
  const obj = new URL(cleanURL);
  // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeScript definitions are incorrect
  for (const [name] of (obj.searchParams as any).entries()) {
    console.debug(`Deleting param ${name}`);
    obj.searchParams.delete(name);
  }
  obj.pathname = "*";
  obj.hash = "";
  console.debug(`Generate match pattern`, { href: obj.href });
  return obj.href;
}
