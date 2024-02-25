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

import {
  type PlatformProtocol,
  uninitializedPlatform,
} from "@/platform/platformProtocol";

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
 * @param platformProtocol
 */
export function setPlatform(platformProtocol: PlatformProtocol): void {
  platform = platformProtocol;
}
