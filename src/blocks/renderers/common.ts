/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Logger } from "@/core";
import { PanelComponent } from "@/extensionPoints/dom";

function isRendererOutput(value: unknown): boolean {
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
  renderPromise: Promise<PanelComponent>,
  logger: Logger
): Promise<PanelComponent> {
  try {
    const value = await renderPromise;

    if (!isRendererOutput(value)) {
      logger.warn("Expected a renderer brick");
      return `<div style="color: red;">Expected a renderer brick</div>`;
    }

    // TODO: validate the shape of the value returned
    return value;

    // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch
  } catch (error) {
    logger.error(error);
    return `<div>An error occurred: ${error.toString()}</div>`;
  }
}
