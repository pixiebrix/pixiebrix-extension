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
import { PropError } from "@/errors/businessErrors";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * Prompt API EPP documentation: https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c/
 *
 * See https://developer.chrome.com/docs/extensions/ai
 *
 * @since 2.1.6
 */
class LocalChatCompletionTransformer extends TransformerABC {
  static BRICK_ID = validateRegistryId(
    "@pixiebrix/ai/prompt-api-chat-completion",
  );

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      LocalChatCompletionTransformer.BRICK_ID,
      "[Experimental] Local AI Chat Completion",
      "Run a AI chat completion locally using Gemini Nano",
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
      messages: {
        type: "array",
        description: "The prompt messages",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              description: "The message role",
              enum: ["system", "user", "assistant"],
            },
            content: {
              type: "string",
              description: "The prompt message content",
            },
          },
          required: ["role", "content"],
        },
      },
      temperature: {
        type: "number",
        description: "The temperature for the AI",
      },
      topK: {
        type: "number",
        description: "The topK for the AI",
      },
    },
    ["messages"],
  );

  async transform(
    {
      messages,
      topK,
      temperature,
    }: BrickArgs<{
      messages: Message[];
      topK?: number;
      temperature?: number;
    }>,
    { abortSignal }: BrickOptions,
  ): Promise<unknown> {
    await assertAiCapabilities("languageModel");

    const promptMessage = messages.pop();

    if (promptMessage?.role !== "user") {
      throw new PropError(
        "The last message must have a user role",
        LocalChatCompletionTransformer.BRICK_ID,
        "messages",
        messages,
      );
    }

    if (messages.filter((x) => x.role === "system").length > 1) {
      throw new PropError(
        "Expected at most one system message",
        LocalChatCompletionTransformer.BRICK_ID,
        "messages",
        messages,
      );
    }

    if (messages.findIndex((x) => x.role === "system") > 0) {
      throw new PropError(
        "Expected system message to be the first message",
        LocalChatCompletionTransformer.BRICK_ID,
        "messages",
        messages,
      );
    }

    const session = await window.ai.languageModel.create({
      // https://github.com/explainers-by-googlers/prompt-api?tab=readme-ov-file#n-shot-prompting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- data validation above
      initialPrompts: messages as any,
      topK,
      temperature,
      signal: abortSignal,
    });

    try {
      return {
        content: await session.prompt(promptMessage.content, {
          signal: abortSignal,
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

export default LocalChatCompletionTransformer;
