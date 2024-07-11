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

import { EffectABC } from "@/types/bricks/effectTypes";
import { type Schema } from "@/types/schemaTypes";
import { type BrickArgs } from "@/types/runtimeTypes";
import { validateRegistryId } from "@/types/helpers";
import type { SanitizedConfig } from "@/integrations/integrationTypes";
import { tabCapture } from "@/background/messenger/api";
import { minimalSchemaFactory, propertiesToSchema } from "@/utils/schemaUtils";

const DEEPGRAM_INTEGRATION_REF =
  "https://app.pixiebrix.com/schemas/services/deepgram/api";

export class StartCaptureAudioEffect extends EffectABC {
  static BRICK_ID = validateRegistryId(
    "@pixiebrix/browser/audio-capture-start",
  );

  constructor() {
    super(
      StartCaptureAudioEffect.BRICK_ID,
      "Capture Audio",
      "Start capturing audio from the tab",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      // TODO: decide whether to make deepgram specific, or vary brick/options based on provider
      integrationConfig: {
        title: "Deepgram Integration",
        $ref: DEEPGRAM_INTEGRATION_REF,
      },
      captureMicrophone: {
        type: "boolean",
        description: "Whether to capture audio from the microphone",
        default: true,
      },
      captureTab: {
        type: "boolean",
        description: "Whether to capture audio from the tab",
        default: true,
      },
    },
    ["integrationConfig"],
  );

  async effect({
    integrationConfig,
    captureMicrophone = true,
    captureTab = true,
  }: BrickArgs<{
    integrationConfig: SanitizedConfig;
    captureMicrophone: boolean;
    captureTab: boolean;
  }>): Promise<void> {
    // TODO: show popover to get user to confirm capture?
    await tabCapture.startAudioCapture({
      integrationConfig,
      captureMicrophone,
      captureTab,
    });
  }
}

export class StopCaptureAudioEffect extends EffectABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/browser/audio-capture-stop");

  constructor() {
    super(
      StopCaptureAudioEffect.BRICK_ID,
      "Stop Audio Capture",
      "Stop capturing audio from the tab",
    );
  }

  inputSchema: Schema = minimalSchemaFactory();

  async effect(): Promise<void> {
    await tabCapture.stopAudioCapture();
  }
}
