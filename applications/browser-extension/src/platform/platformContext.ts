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

import { type PlatformProtocol } from "@/platform/platformProtocol";
import {
  type PlatformCapability,
  PlatformCapabilityNotAvailableError,
} from "@/platform/capabilities";
import { PlatformBase } from "@/platform/platformBase";

import { normalizeSemVerString } from "@/types/semVerHelpers";

/**
 * A platform protocol with no available capabilities.
 */
export const uninitializedPlatform = new PlatformBase(
  "uninitialized",
  normalizeSemVerString("0.0.0"),
);

/**
 * @file defines an explicit platform protocol
 */

let platform: PlatformProtocol = uninitializedPlatform;

/**
 * Get the current global platform. Prefer injecting via constructor/options vs. using the global platform.
 */
export function getPlatform(): PlatformProtocol {
  return platform;
}

/**
 * Set the current ambient platform. Should be called once at the beginning of the application.
 */
export function setPlatform(platformProtocol: PlatformProtocol): void {
  platform = platformProtocol;
}

/**
 * Assert that the global platform supports a capability.
 *
 * For web-extension context checks, use expectContext
 *
 * Use instead of expectContext for platform capabilities.
 *
 * @param capability the platform capability to assert
 * @see expectContext
 * @throws PlatformCapabilityNotAvailableError if the capability is not available
 * @since 1.8.10
 */
export function assertPlatformCapability(capability: PlatformCapability): void {
  if (!platform.capabilities.includes(capability)) {
    throw new PlatformCapabilityNotAvailableError(
      platform.platformName,
      capability,
    );
  }
}
