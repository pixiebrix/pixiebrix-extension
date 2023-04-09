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

import { type UUID } from "@/types/stringTypes";
import { type RegistryId, type SemVerString } from "@/types/registryTypes";
import { type contextNames } from "webext-detect-page";
import { type UnknownObject } from "@/types/objectTypes";

// `ContextName`s from webext-detect-page
type ContextName = keyof typeof contextNames | "unknown";

/**
 * Log event metadata for the extensions internal logging infrastructure.
 * @see Logger
 */
export type MessageContext = {
  /**
   * A human-readable label, e.g., provided via a `label:` directive to help identify the step context when there's
   * multiple blocks with the same id being used.
   *
   * @see MessageContext.extensionLabel
   */
  readonly label?: string;
  readonly deploymentId?: UUID;
  readonly blueprintId?: RegistryId;
  readonly blueprintVersion?: SemVerString;
  readonly extensionPointId?: RegistryId;
  readonly blockId?: RegistryId;
  readonly blockVersion?: SemVerString;
  readonly extensionId?: UUID;
  /**
   * The human-readable label for the extension. Used to identify the extension when reporting telemetry from a
   * blueprint. (Each extension install has a different UUID)
   * @since 1.6.2
   */
  readonly extensionLabel?: string;
  readonly serviceId?: RegistryId;
  readonly serviceVersion?: SemVerString;
  readonly authId?: UUID;
  readonly pageName?: ContextName;
};

export interface Logger {
  readonly context: MessageContext;
  /**
   * Return a new child logger with additional message context
   */
  childLogger: (additionalContext: MessageContext) => Logger;
  trace: (message: string, data?: UnknownObject) => void;
  warn: (message: string, data?: UnknownObject) => void;
  debug: (message: string, data?: UnknownObject) => void;
  log: (message: string, data?: UnknownObject) => void;
  info: (message: string, data?: UnknownObject) => void;
  error: (error: unknown, data?: UnknownObject) => void;
}
