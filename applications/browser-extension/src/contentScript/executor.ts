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

import { type RunBrickRequest } from "@/contentScript/messenger/runBrickTypes";
import { BusinessError } from "@/errors/businessErrors";
import contentScriptPlatform from "@/contentScript/contentScriptPlatform";

/**
 * Handle a remote brick run request from another tab/frame.
 */
export async function runBrick(request: RunBrickRequest): Promise<unknown> {
  // XXX: validate sourceTabId? Can't use childTabs because we also support `window: broadcast`
  const { brickId, brickArgs, options } = request;
  const brick = await contentScriptPlatform.registry.bricks.lookup(brickId);
  const logger = contentScriptPlatform.logger.childLogger(
    options.messageContext,
  );

  try {
    return await brick.run(brickArgs, {
      platform: contentScriptPlatform,
      ctxt: options.ctxt as UnknownObject,
      meta: options.meta,
      logger,
      root: document,
      async runPipeline() {
        throw new BusinessError(
          "Support for running pipelines in other contexts not implemented",
        );
      },
      async runRendererPipeline() {
        throw new BusinessError(
          "Support for running pipelines in other contexts not implemented",
        );
      },
    });
  } catch (error) {
    // Provide extra logging on the tab because `handlers` doesn't report errors. It's also nice to log here because
    // we still have the original (non-serialized) error
    console.info("Error running remote brick on tab", {
      request,
      error,
    });
    throw error;
  }
}
