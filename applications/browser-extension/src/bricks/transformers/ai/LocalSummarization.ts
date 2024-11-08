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

import { TransformerABC } from "../../../types/bricks/transformerTypes";
import { type BrickArgs, type BrickOptions } from "../../../types/runtimeTypes";
import { validateRegistryId } from "../../../types/helpers";
import { propertiesToSchema } from "../../../utils/schemaUtils";
import { type PlatformCapability } from "../../../platform/capabilities";
import {
  assertAiCapabilities,
  throwIfBusinessError,
} from "./domAiHelpers";

// Copied from @types/dom-chromium-ai because they're not exported
type AISummarizerType = "tl;dr" | "key-points" | "teaser" | "headline";
type AISummarizerFormat = "plain-text" | "markdown";
type AISummarizerLength = "short" | "medium" | "long";

/**
 * Summarization API EPP documentation: https://docs.google.com/document/d/1Bvd6cU9VIEb7kHTAOCtmmHNAYlIZdeNmV7Oy-2CtimA/
 *
 * Resources:
 * - https://github.com/WICG/writing-assistance-apis/blob/main/README.md#summarizer-api
 * - https://chromestatus.com/feature/5193953788559360
 * - https://developer.chrome.com/docs/extensions/ai
 *
 * @since 2.1.6
 */
class LocalSummarization extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/ai/summarization-api");

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      LocalSummarization.BRICK_ID,
      "[Experimental] Local Summarization",
      "Run summarization locally using Gemini Nano",
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
      input: {
        type: "string",
        description: "The text to summarize",
      },
      context: {
        type: "string",
        description:
          "Context about the text to summarize, e.g., text/content type",
      },
      type: {
        type: "string",
        description: "The type of summarization",
        enum: ["tl;dr", "key-points", "teaser", "headline"],
      },
      format: {
        type: "string",
        description: "The format of the summarization",
        enum: ["plain-text", "markdown"],
      },
      length: {
        type: "string",
        description: "The length of the summarization",
        enum: ["short", "medium", "long"],
      },
    },
    ["input"],
  );

  async transform(
    {
      input,
      type,
      context,
      format,
      length,
    }: BrickArgs<{
      input: string;
      type?: AISummarizerType;
      context?: string;
      format?: AISummarizerFormat;
      length?: AISummarizerLength;
    }>,
    { abortSignal }: BrickOptions,
  ): Promise<unknown> {
    await assertAiCapabilities("summarizer");

    const session = await window.ai.summarizer.create({
      signal: abortSignal,
      type,
      format,
      length,
    });

    try {
      return {
        content: await session.summarize(input, {
          signal: abortSignal,
          context,
        }),
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

export default LocalSummarization;
