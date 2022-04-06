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

import { Logger, MessageContext } from "@/core";
import { UnknownObject } from "@/types";
import { getErrorMessage } from "@/errors";

class ConsoleLogger implements Logger {
  readonly context: MessageContext = {};

  constructor(context: MessageContext = {}) {
    this.context = { ...context };
  }

  childLogger(context: MessageContext = {}): Logger {
    return new ConsoleLogger({ ...this.context, ...context });
  }

  trace(message: string, data?: UnknownObject): void {
    console.debug(message, data);
  }

  debug(message: string, data: UnknownObject): void {
    console.debug(message, data);
  }

  error(error: unknown, data: UnknownObject): void {
    console.debug(getErrorMessage(error), { error, data });
  }

  info(message: string, data: UnknownObject): void {
    console.debug(message, data);
  }

  log(message: string, data: UnknownObject): void {
    console.debug(message, data);
  }

  warn(message: string, data: UnknownObject): void {
    console.debug(message, data);
  }
}

export default ConsoleLogger;
