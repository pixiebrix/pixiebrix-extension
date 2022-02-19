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

import { ApiVersion, Metadata } from "@/core";
import { Availability, ReaderConfig } from "@/blocks/types";

export type ExtensionPointType =
  | "panel"
  | "menuItem"
  | "trigger"
  | "contextMenu"
  | "sidebar"
  | "quickBar";

export interface ExtensionPointDefinition {
  type: ExtensionPointType;
  isAvailable: Availability;
  reader: ReaderConfig;
}

export interface ExtensionPointConfig<
  T extends ExtensionPointDefinition = ExtensionPointDefinition
> {
  apiVersion?: ApiVersion;
  metadata: Metadata;
  definition: T;
  kind: "extensionPoint";
}

export function assertExtensionPointConfig(
  maybeExtensionPointConfig: unknown
): asserts maybeExtensionPointConfig is ExtensionPointConfig {
  const errorContext = { value: maybeExtensionPointConfig };

  if (typeof maybeExtensionPointConfig !== "object") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError("Expected object for ExtensionPointConfig");
  }

  const config = maybeExtensionPointConfig as Record<string, unknown>;

  if (config.kind !== "extensionPoint") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError(
      "Expected kind 'extensionPoint' for ExtensionPointConfig"
    );
  }

  if (typeof config.definition !== "object") {
    console.warn("Expected extension point", errorContext);
    throw new TypeError(
      "Expected object for definition in ExtensionPointConfig"
    );
  }

  const definition = config.definition as ExtensionPointDefinition;

  if (typeof definition.isAvailable !== "object") {
    console.warn("Expected object for definition.isAvailable", errorContext);
    throw new TypeError("Invalid definition in ExtensionPointConfig");
  }
}
