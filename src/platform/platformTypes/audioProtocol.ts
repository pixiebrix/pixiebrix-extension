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

import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";

/**
 * Protocol for playing/capturing audio.
 * @since 1.8.10
 */
export type AudioProtocol = {
  /**
   * Play a known sound effect.
   */
  play(soundEffect: string): Promise<void>;

  /**
   * [Experimental] Start capturing audio.
   * @since 2.0.7
   */
  // XXX: move to a `capture` protocol?
  startCapture(
    integrationConfig: SanitizedIntegrationConfig,
    options: {
      captureMicrophone: boolean;
      captureSystem: boolean;
    },
  ): Promise<void>;

  /**
   * [Experimental] Stop capturing audio.
   * @since 2.0.7
   */
  // XXX: move to a `capture` protocol?
  stopCapture(): Promise<void>;
};
