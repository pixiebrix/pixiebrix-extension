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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { validateRegistryId } from "@/types/helpers";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { type PlatformCapability } from "@/platform/capabilities";
import {
  assertAiCapabilities,
  throwIfBusinessError,
} from "@/bricks/transformers/ai/domAiHelpers";

/**
 * Prompt API EPP documentation: https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c/
 *
 * See https://developer.chrome.com/docs/extensions/ai
 *
 * @since 2.1.6
 */
class LocalPromptTransformer extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/ai/prompt-api");

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      LocalPromptTransformer.BRICK_ID,
      "[Experimental] Local AI Prompt",
      "Run a AI prompt locally using Gemini Nano",
    );
  }

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["dom"];
  }

  override outputSchema = propertiesToSchema(
    {
      content: {
        type: "string",
        description: "The response from the AI",
      },
    },
    ["content"],
  );

  inputSchema = propertiesToSchema(
    {
      prompt: {
        type: "string",
        description: "The user prompt",
      },
      systemPrompt: {
        type: "string",
        description: "The system prompt",
      },
      temperature: {
        type: "number",
        description: "The temperature for the language model",
      },
      topK: {
        type: "number",
        description: "The topK for the language model",
      },
    },
    ["prompt"],
  );

  async transform(
    {
      prompt,
      systemPrompt,
      topK,
      temperature,
    }: BrickArgs<{
      prompt: string;
      systemPrompt?: string;
      topK?: number;
      temperature?: number;
    }>,
    { abortSignal }: BrickOptions,
  ): Promise<unknown> {
    await assertAiCapabilities("languageModel");

    const session = await window.ai.languageModel.create({
      systemPrompt,
      topK,
      temperature,
      signal: abortSignal,
    });

    try {
      return {
        content: await session.prompt(prompt, { signal: abortSignal }),
      };
    } catch (error) {
      throwIfBusinessError(error);
      throw error;
    } finally {
      // Immediately destroy the session to free up resources instead of waiting for GC. (Because sessions are
      // not shared across brick runs).
      // For performance, consider keeping around previous N sessions and as a form of prompt caching.
      session.destroy();
    }
  }
}

export default LocalPromptTransformer;
