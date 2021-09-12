/* eslint-disable filenames/match-exported */
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

import { browser } from "webextension-polyfill-ts";
import blockRegistry from "@/blocks/registry";
import { BackgroundLogger } from "@/background/logging";
import { MessageContext, RegistryId, RenderedArgs } from "@/core";
import {
  liftContentScript,
  MESSAGE_PREFIX,
} from "@/contentScript/backgroundProtocol";
import { Availability } from "@/blocks/types";
import { checkAvailable } from "@/blocks/available";
import { expectContext } from "@/utils/expectContext";
import { HandlerMap } from "@/messaging/protocol";

export const MESSAGE_CHECK_AVAILABILITY = `${MESSAGE_PREFIX}CHECK_AVAILABILITY`;
export const MESSAGE_RUN_BLOCK = `${MESSAGE_PREFIX}RUN_BLOCK`;

export interface RemoteBlockOptions {
  ctxt: unknown;
  messageContext: MessageContext;
  maxRetries?: number;
  isAvailable?: Availability;
}

export interface CheckAvailabilityAction {
  type: typeof MESSAGE_CHECK_AVAILABILITY;
  payload: {
    isAvailable: Availability;
  };
}

export interface RunBlockAction {
  type: typeof MESSAGE_RUN_BLOCK;
  payload: {
    sourceTabId?: number;
    nonce?: string;
    blockId: RegistryId;
    blockArgs: RenderedArgs;
    options: RemoteBlockOptions;
  };
}

const childTabs = new Set<number>();

const handlers = new HandlerMap();

handlers.set(MESSAGE_RUN_BLOCK, async (request: RunBlockAction) => {
  // XXX: validate sourceTabId? Can't use childTabs because we also support `window: broadcast`
  const { blockId, blockArgs, options } = request.payload;
  const block = await blockRegistry.lookup(blockId);
  const logger = new BackgroundLogger(options.messageContext);

  try {
    return await block.run(blockArgs, {
      ctxt: options.ctxt,
      logger,
      root: document,
    });
  } catch (error: unknown) {
    // Provide extra logging on the tab because `handlers` doesn't report errors. It's also nice to log here because
    // we still have the original (non-serialized) error
    console.info(`Error running remote block on tab`, {
      request,
      error,
    });
    throw error;
  }
});

handlers.set(
  MESSAGE_CHECK_AVAILABILITY,
  async (request: CheckAvailabilityAction) => {
    const { isAvailable } = request.payload;
    return checkAvailable(isAvailable);
  }
);

export const linkChildTab = liftContentScript(
  "TAB_OPENED",
  async (tabId: number) => {
    childTabs.add(tabId);
  },
  { asyncResponse: false }
);

function addExecutorListener(): void {
  expectContext("contentScript");

  browser.runtime.onMessage.addListener(handlers.asListener());
}

export default addExecutorListener;
