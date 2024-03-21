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

import { BusinessError } from "@/errors/businessErrors";

import { safeParseUrl } from "@/utils/urlUtils";

/**
 * Returns a URL with one of the allow-listed schemas, or throws a BusinessError
 * @param url an absolute or relative URL
 * @param allowedProtocols the protocol allow-list, including the colon (e.g., "https:")
 * @param baseUrl the baseUrl to use if url is relative
 * @return the URL instance
 * @throws BusinessError if the URL is invalid
 */
export function assertProtocolUrl(
  url: string,
  allowedProtocols: string[],
): URL {
  const parsedUrl = safeParseUrl(url);

  if (allowedProtocols.includes(parsedUrl.protocol)) {
    return parsedUrl;
  }

  if (parsedUrl.protocol === "invalid-url:") {
    throw new BusinessError(`Invalid URL: ${url}`);
  }

  throw new BusinessError(
    `Unsupported protocol: ${parsedUrl.protocol}. Use ${allowedProtocols.join(
      ", ",
    )}`,
  );
}
