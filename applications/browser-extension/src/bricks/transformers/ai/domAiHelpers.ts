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

/// <reference types="@types/dom-chromium-ai" />

import { BusinessError } from "../../../errors/businessErrors";
import { getErrorMessage } from "../../../errors/errorHelpers";

const UNTESTED_LANGUAGE_ERROR =
  "The model attempted to output text in an untested language, and was prevented from doing so.";

type ModelType = "summarizer" | "languageModel";

/**
 * Assert AI capabilities are available for the given AI model type.
 *
 * If the model namespace is available but not downloaded, triggers a download.
 *
 * @param modelType the built-in AI model type
 * @throws BusinessError if the model is not available, or the model is queued for download
 */
export async function assertAiCapabilities(
  modelType: ModelType,
): Promise<void> {
  if (window.ai === undefined) {
    throw new BusinessError("Local AI APIs not available");
  }

  // eslint-disable-next-line security/detect-object-injection -- see type ModelFactory
  const model = window.ai[modelType];

  if (model === undefined) {
    throw new BusinessError(`Local APIs not available: ${modelType}`);
  }

  let capabilities = await model.capabilities();

  if (capabilities.available === "no") {
    // Force Chrome to schedule a model download
    try {
      const session = await model.create();
      session.destroy();
    } catch {
      // NOP
    }
  }

  capabilities = await model.capabilities();

  // Re-check capabilities after queuing download to determine if download was successfully queued
  switch (capabilities.available) {
    case "no": {
      throw new BusinessError(
        `Unable to queue local model download: ${modelType}`,
      );
    }

    case "after-download": {
      throw new BusinessError(
        `Local model is queued for download: ${modelType}`,
      );
    }

    default:
  }
}

/**
 * Convert prompt errors from the AI model to a BusinessError.
 * @throws BusinessError if the error is a prompt error
 */
export function throwIfBusinessError(error: unknown): void {
  if (getErrorMessage(error) === UNTESTED_LANGUAGE_ERROR) {
    throw new BusinessError(UNTESTED_LANGUAGE_ERROR, {
      cause: error,
    });
  }
}
