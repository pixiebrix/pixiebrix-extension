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

import { MessageContext } from "@/core";
import { getErrorMessage } from "@/errors";

// A mock that doesn't call the background page to report the error
function reportError(error: unknown, context?: MessageContext): void {
  console.error("Report error: %s", getErrorMessage(error), {
    error,
    context,
  });

  throw new Error(`Unexpected call to reportError: ${getErrorMessage(error)}`);
}

export default reportError;
