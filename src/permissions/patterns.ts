/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { ParsedDomain, parse } from "psl";

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
  const { domain } = parse(urlClass.hostname) as ParsedDomain;
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
