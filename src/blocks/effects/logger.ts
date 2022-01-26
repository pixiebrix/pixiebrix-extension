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
import { propertiesToSchema } from "@/validators/generic";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_MAP = new Map<Level, typeof console.debug>([
  ["debug", console.debug],
  ["warn", console.warn],
  ["info", console.info],
  ["error", console.error],
]);

export class LogEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/log",
      "Log To Console",
      "Log a message to the Browser's console",
      "faSearch"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      message: {
        type: "string",
        description: "The message to log",
      },
      level: {
        type: "string",
        description: "The log level",
        enum: ["debug", "info", "warn", "error"],
        default: "info",
      },
      data: {
        description:
          "Data to log with the message, or omit to log the current context",
      },
    },
    ["message"]
  );

  async effect(
    {
      message,
      level = "info",
      data,
    }: BlockArg<{ message: string; level: Level; data: unknown }>,
    { ctxt }: BlockOptions
  ): Promise<void> {
    const logMethod = LEVEL_MAP.get(level) ?? console.info;
    logMethod(message, data ?? ctxt);
  }
}
