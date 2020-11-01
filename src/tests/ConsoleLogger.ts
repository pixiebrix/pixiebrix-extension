/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Logger } from "@/core";

class ConsoleLogger implements Logger {
  childLogger(): Logger {
    return new ConsoleLogger();
  }

  trace(msg: string, data?: Record<string, unknown>): void {
    console.debug(msg, data);
  }

  debug(msg: string, data: Record<string, unknown>): void {
    console.debug(msg, data);
  }

  error(error: unknown, data: Record<string, unknown>): void {
    console.debug(error.toString(), { error, data });
  }

  info(msg: string, data: Record<string, unknown>): void {
    console.debug(msg, data);
  }

  log(msg: string, data: Record<string, unknown>): void {
    console.debug(msg, data);
  }

  warn(msg: string, data: Record<string, unknown>): void {
    console.debug(msg, data);
  }
}

export default ConsoleLogger;
