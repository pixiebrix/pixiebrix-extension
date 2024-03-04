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

import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { realConsole } from "@/development/runtimeLogging";
import { propertiesToSchema } from "@/utils/schemaUtils";

type Level = "debug" | "info" | "warn" | "error";

// Be sure to use the real `console` methods, not the proxy that's used to mute runtime logging
const LEVEL_MAP = new Map<Level, typeof realConsole.debug>([
  ["debug", realConsole.debug],
  ["warn", realConsole.warn],
  ["info", realConsole.info],
  ["error", realConsole.error],
]);

export class LogEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/browser/log",
      "Log To Console",
      "Log a message to the Browser's console",
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
    ["message"],
  );

  async effect(
    {
      message,
      level = "info",
      data,
    }: BrickArgs<{ message: string; level: Level; data: unknown }>,
    { ctxt }: BrickOptions,
  ): Promise<void> {
    const logMethod = LEVEL_MAP.get(level) ?? realConsole.info;
    logMethod(message, data ?? ctxt);
  }
}
