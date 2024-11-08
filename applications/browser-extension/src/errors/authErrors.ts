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

import { BusinessError } from "./businessErrors";

/**
 * Thrown when an interactive login is required to proceed but is not available, e.g., for use with
 * `identity.launchWebAuthFlow`
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity/launchWebAuthFlow#interactive
 * @since 1.8.11
 */
export class InteractiveLoginRequiredError extends BusinessError {
  override name = "InteractiveLoginRequiredError";

  constructor(message: string, { cause }: { cause?: unknown } = {}) {
    super(message ?? "An interactive login is required", { cause });
  }
}
