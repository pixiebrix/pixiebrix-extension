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

import { Logger, RendererOutput, SafeHTML } from "@/core";
import { getErrorMessage } from "@/errors/errorHelpers";
import sanitize from "@/utils/sanitize";
import { UnknownObject } from "@/types";
import { escape } from "lodash";

// Require SafeHTML here, because if we just accepted unknown, this would return `true` even for unsanitized strings
function isRendererOutput(
  value: SafeHTML | UnknownObject
): value is RendererOutput {
  if (typeof value === "string") {
    return true;
  }

  if (value != null && typeof value === "object") {
    const keys = Object.keys(value);
    return (
      keys.length > 0 &&
      keys.every((key) => ["Component", "props"].includes(key))
    );
  }

  return false;
}

/** An error boundary for renderers */
export async function errorBoundary(
  renderPromise: Promise<RendererOutput>,
  logger: Logger
): Promise<RendererOutput> {
  try {
    const value = await renderPromise;

    if (!isRendererOutput(value)) {
      logger.warn("Expected a renderer output");
      return sanitize(
        '<div style="color: red;">Expected a renderer brick</div>'
      );
    }

    // TODO: validate the shape of the value returned
    return value;
  } catch (error) {
    logger.error(error);
    const escapedMessage = escape(getErrorMessage(error));
    return sanitize(`<div>An error occurred: ${escapedMessage}</div>`);
  }
}
