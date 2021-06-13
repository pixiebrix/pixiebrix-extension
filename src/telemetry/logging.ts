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

import { recordError } from "@/background/logging";
import Rollbar from "rollbar";
import { MessageContext, SerializedError } from "@/core";
import { serializeError } from "serialize-error";
import { isExtensionContext } from "@/chrome";

function selectError(exc: any): SerializedError {
  if (exc?.message && exc?.type === "unhandledrejection") {
    exc = {
      // @ts-ignore: OK given the type of reason on unhandledrejection
      message: exc.reason?.message ?? "Uncaught error in promise",
    };
  }

  return serializeError(exc);
}

export function reportError(exc: unknown, context?: MessageContext): void {
  if (isExtensionContext()) {
    recordError(selectError(exc), context, null);
  } else {
    (Rollbar as any).error(exc);
  }
}
