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
import { JsonObject } from "type-fest";
import { getErrorMessage, isConnectionError } from "@/errors";
import { isContentScript } from "webext-detect-page";
import { showConnectionLost } from "@/contentScript/connection";
import { serializeError } from "serialize-error";
import { recordError, recordLog } from "@/background/messenger/api";
import { expectContext } from "@/utils/expectContext";

/**
 * A Logger that logs messages through the background page (which can make calls to Rollbar)
 * @see recordLog
 * @see recordError
 */
class BackgroundLogger implements Logger {
  readonly context: MessageContext;

  constructor(context: MessageContext = null) {
    expectContext(
      "extension",
      "BackgroundLogger requires access to the background messenger API"
    );

    this.context = context ?? {};
  }

  childLogger(context: MessageContext): Logger {
    return new BackgroundLogger({ ...this.context, ...context });
  }

  async trace(message: string, data: JsonObject): Promise<void> {
    console.trace(message, { data, context: this.context });
    recordLog(this.context, "trace", message, data);
  }

  async debug(message: string, data: JsonObject): Promise<void> {
    console.debug(message, { data, context: this.context });
    recordLog(this.context, "debug", message, data);
  }

  async log(message: string, data: JsonObject): Promise<void> {
    console.log(message, { data, context: this.context });
    recordLog(this.context, "info", message, data);
  }

  async info(message: string, data: JsonObject): Promise<void> {
    console.info(message, { data, context: this.context });
    recordLog(this.context, "info", message, data);
  }

  async warn(message: string, data: JsonObject): Promise<void> {
    console.warn(message, { data, context: this.context });
    recordLog(this.context, "warn", message, data);
  }

  async error(error: unknown, data: JsonObject): Promise<void> {
    console.error("An error occurred: %s", getErrorMessage(error), {
      error,
      context: this.context,
      data,
    });

    if (isConnectionError(error) && isContentScript()) {
      showConnectionLost();
    }

    recordError(serializeError(error), this.context, data);
  }
}

export default BackgroundLogger;
