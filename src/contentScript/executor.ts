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

import blockRegistry from "@/blocks/registry";
import { BackgroundLogger } from "@/background/logging";
import { BlockArg, MessageContext, RegistryId } from "@/core";
import { Availability } from "@/blocks/types";

export interface RemoteBlockOptions {
  ctxt: unknown;
  messageContext: MessageContext;
  maxRetries?: number;
  isAvailable?: Availability;
}

export interface RunBlock {
  sourceTabId?: number;
  nonce?: string;
  blockId: RegistryId;
  blockArgs: BlockArg;
  options: RemoteBlockOptions;
}

const childTabs = new Set<number>();

export async function runBrick(request: RunBlock): Promise<unknown> {
  // XXX: validate sourceTabId? Can't use childTabs because we also support `window: broadcast`
  const { blockId, blockArgs, options } = request;
  const block = await blockRegistry.lookup(blockId);
  const logger = new BackgroundLogger(options.messageContext);

  try {
    return await block.run(blockArgs, {
      ctxt: options.ctxt,
      logger,
      root: document,
    });
  } catch (error) {
    // Provide extra logging on the tab because `handlers` doesn't report errors. It's also nice to log here because
    // we still have the original (non-serialized) error
    console.info("Error running remote block on tab", {
      request,
      error,
    });
    throw error;
  }
}

export async function linkChildTab(tabId: number): Promise<void> {
  childTabs.add(tabId);
}
