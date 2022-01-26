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

import { Effect } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { awaitElementOnce } from "@/extensionPoints/helpers";
import { runInMillis, sleep, TimeoutError } from "@/utils";
import { BusinessError } from "@/errors";

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
    },
    required: ["selector"],
  };

  async effect(
    {
      selector,
      maxWaitMillis = 0,
    }: BlockArg<{
      selector: string | string[];
      maxWaitMillis: number | undefined;
    }>,
    { logger }: BlockOptions
  ): Promise<void> {
    // Single string for logging, the exact format isn't that important
    const combinedSelector = Array.isArray(selector)
      ? selector.join(" ")
      : selector;

    console.debug("Waiting for element: %s", combinedSelector, {
      selector,
      maxWaitMillis,
    });

    logger.debug(`Waiting for element: ${combinedSelector}`);

    if (maxWaitMillis > 0) {
      const [promise, cancel] = awaitElementOnce(selector);
      try {
        await runInMillis(async () => promise, maxWaitMillis);
      } catch (error) {
        cancel();

        if (error instanceof TimeoutError) {
          throw new BusinessError(
            `Element not available in ${maxWaitMillis} milliseconds`
          );
        }

        throw error;
      }
    } else {
      const [promise] = awaitElementOnce(selector);
      await promise;
    }

    logger.debug(`Found element: ${combinedSelector}`);
  }
}
