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

import { EffectABC } from "../../types/bricks/effectTypes";
import { awaitElementOnce } from "../../starterBricks/helpers";
import { BusinessError } from "@/errors/businessErrors";
import { IS_ROOT_AWARE_BRICK_PROPS } from "../rootModeHelpers";
import { type Schema } from "../../types/schemaTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type SelectorRoot,
} from "../../types/runtimeTypes";
import { sleep } from "../../utils/timeUtils";
import { mergeSignals } from "abort-utils";

export class WaitEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/wait/sleep",
      "Wait/Sleep",
      "Wait/Sleep before continuing",
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
    { timeMillis = 0 }: BrickArgs<{ timeMillis: number }>,
    { logger }: BrickOptions,
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
async function awaitElement({
  selector,
  $root,
  maxWaitMillis = 0,
  abortSignal,
}: {
  selector: string;
  $root: JQuery<SelectorRoot>;
  maxWaitMillis?: number;
  abortSignal?: AbortSignal;
}): Promise<JQuery<HTMLElement | Document>> {
  if (maxWaitMillis === 0) {
    return awaitElementOnce(selector, abortSignal, $root);
  }

  const timeout = AbortSignal.timeout(maxWaitMillis);
  const element = await awaitElementOnce(
    selector,
    mergeSignals(abortSignal, timeout),
    $root,
  );

  if (timeout.aborted) {
    throw new BusinessError(
      `Element not available in ${maxWaitMillis} milliseconds`,
    );
  }

  return element;
}

export class WaitElementEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/wait/element",
      "Wait for a DOM element",
      "Wait for a DOM element to be available on the page",
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
    }: BrickArgs<{
      selector: string | string[];
      maxWaitMillis: number;
      isRootAware: boolean;
    }>,
    { logger, root = document, abortSignal }: BrickOptions,
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
