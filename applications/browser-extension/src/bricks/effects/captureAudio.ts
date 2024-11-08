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

import { EffectABC } from "../../types/bricks/effectTypes";
import { type Schema } from "../../types/schemaTypes";
import { type BrickArgs, type BrickOptions } from "../../types/runtimeTypes";
import { validateRegistryId } from "../../types/helpers";
import type { SanitizedIntegrationConfig } from "../../integrations/integrationTypes";
import { minimalSchemaFactory, propertiesToSchema } from "../../utils/schemaUtils";
import { DEEPGRAM_INTEGRATION_ID } from "../../contrib/deepgram/deepgramTypes";
import { FeatureFlags } from "../../auth/featureFlags";

const DEEPGRAM_INTEGRATION_REF = `https://app.pixiebrix.com/schemas/services/${DEEPGRAM_INTEGRATION_ID}`;

export class StartCaptureAudioEffect extends EffectABC {
  static BRICK_ID = validateRegistryId(
    "@pixiebrix/browser/audio-capture-start",
  );

  featureFlag = FeatureFlags.FEATURE_FLAG_AUDIO_CAPTURE;

  constructor() {
    super(
      StartCaptureAudioEffect.BRICK_ID,
      "[Experimental] Capture Audio",
      "Start capturing audio",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      integrationConfig: {
        title: "Deepgram Integration",
        $ref: DEEPGRAM_INTEGRATION_REF,
      },
      captureMicrophone: {
        type: "boolean",
        description: "Whether to capture audio from the microphone",
        default: true,
      },
      captureSystem: {
        type: "boolean",
        description: "Whether to capture audio from the system/tab",
        default: true,
      },
    },
    ["integrationConfig"],
  );

  async effect(
    {
      integrationConfig,
      captureMicrophone = true,
      captureSystem = true,
    }: BrickArgs<{
      integrationConfig: SanitizedIntegrationConfig;
      captureMicrophone: boolean;
      captureSystem: boolean;
    }>,
    { platform }: BrickOptions,
  ): Promise<void> {
    // XXX: consider showing popover to get user to confirm capture?
    await platform.capture.startAudioCapture(integrationConfig, {
      captureMicrophone,
      captureSystem,
    });
  }
}

export class StopCaptureAudioEffect extends EffectABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/browser/audio-capture-stop");

  constructor() {
    super(
      StopCaptureAudioEffect.BRICK_ID,
      "[Experimental] Stop Audio Capture",
      "Stop capturing audio",
    );
  }

  featureFlag = FeatureFlags.FEATURE_FLAG_AUDIO_CAPTURE;

  inputSchema: Schema = minimalSchemaFactory();

  async effect(_args: BrickArgs, { platform }: BrickOptions): Promise<void> {
    await platform.capture.stopAudioCapture();
  }
}
