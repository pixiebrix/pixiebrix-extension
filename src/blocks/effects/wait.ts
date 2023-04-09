/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { Effect } from "@/types/blocks/effectTypes";
import { awaitElementOnce } from "@/extensionPoints/helpers";
import { sleep } from "@/utils";
import { BusinessError } from "@/errors/businessErrors";
import pTimeout, { TimeoutError } from "p-timeout";
import { IS_ROOT_AWARE_BRICK_PROPS } from "@/blocks/rootModeHelpers";
import { type Schema } from "@/types/schemaTypes";
import {
  type BlockArg,
  type BlockOptions,
  type ReaderRoot,
} from "@/types/runtimeTypes";

export class WaitEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/wait/sleep",
      "Wait/Sleep",
      "Wait/Sleep before continuing"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      timeMillis: {
        type: "integer",
        description:
          "Time in milliseconds. If value is less than or equal to zero, do not sleep",
      },
    },
    required: ["timeMillis"],
  };

  async effect(
    { timeMillis = 0 }: BlockArg<{ timeMillis: number }>,
    { logger }: BlockOptions
  ): Promise<void> {
    if (timeMillis > 0) {
      logger.debug(`Waiting/sleeping ${timeMillis} milliseconds`);
      await sleep(timeMillis);
    } else {
      logger.debug("Skipping wait/sleep");
    }
  }
}

/**
 * @param selector the element selector
 * @param $root the root element/document to search within
 * @param maxWaitMillis maximum time to wait for the element, or 0 to wait indefinitely
 * @param abortSignal an optional abort signal to cancel the wait
 * @throws BusinessError if the element is not found within the timeout
 */
export async function awaitElement({
  selector,
  $root,
  maxWaitMillis = 0,
  abortSignal,
}: {
  selector: string;
  $root: JQuery<ReaderRoot>;
  maxWaitMillis: number;
  abortSignal?: AbortSignal;
}): Promise<JQuery<HTMLElement | Document>> {
  if (maxWaitMillis > 0) {
    const [promise, cancel] = awaitElementOnce(selector, $root);
    abortSignal?.addEventListener("abort", cancel);

    try {
      return await pTimeout(promise, { milliseconds: maxWaitMillis });
    } catch (error) {
      cancel();

      if (error instanceof TimeoutError) {
        throw new BusinessError(
          `Element not available in ${maxWaitMillis} milliseconds`
        );
      }

      throw error ?? new Error("Unknown error waiting for element");
    }
  } else {
    const [promise, cancel] = awaitElementOnce(selector, $root);
    abortSignal?.addEventListener("abort", cancel);
    return promise;
  }
}

export class WaitElementEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/wait/element",
      "Wait for a DOM element",
      "Wait for a DOM element to be available on the page"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      selector: {
        oneOf: [
          { type: "string", format: "selector" },
          { type: "array", items: { type: "string", format: "selector" } },
        ],
      },
      maxWaitMillis: {
        type: "integer",
        description:
          "Maximum time of to wait in milliseconds. If the value is less than or equal to zero, will wait indefinitely",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    required: ["selector"],
  };

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  async effect(
    {
      selector,
      maxWaitMillis = 0,
      isRootAware,
    }: BlockArg<{
      selector: string | string[];
      maxWaitMillis: number | undefined;
      isRootAware: boolean;
    }>,
    { logger, root, abortSignal }: BlockOptions
  ): Promise<void> {
    // Single string for logging, the exact format isn't that important
    const combinedSelector = Array.isArray(selector)
      ? selector.join(" ")
      : selector;

    const $root = $(isRootAware ? root : document);

    console.debug("Waiting for element: %s", combinedSelector, {
      selector,
      maxWaitMillis,
    });

    logger.debug(`Waiting for element: ${combinedSelector}`);

    await awaitElement({
      selector: combinedSelector,
      $root,
      abortSignal,
      maxWaitMillis,
    });

    logger.debug(`Found element: ${combinedSelector}`);
  }
}
