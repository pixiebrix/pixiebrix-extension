/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { JSDOM } from "jsdom";
import { Reader } from "@/types";
import { type ElementReference, type ReaderOutput, type Schema } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { getReferenceForElement } from "@/contentScript/elementReference";

/**
 * Helper function returns a promise that resolves after all other promise mocks, even if they are chained
 * like Promise.resolve().then(...).
 *
 * (Technically: this is designed to resolve on the next macrotask)
 */
export async function tick(): Promise<void> {
  // Copied from https://stackoverflow.com/questions/37408834/testing-with-reacts-jest-and-enzyme-when-simulated-clicks-call-a-function-that
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function getDocument(html: string): Document {
  return new JSDOM(html).window.document;
}

/**
 * Reader that stores the root element passed to it. Useful for testing target modes.
 */
export class RootReader extends Reader {
  ref: ElementReference;
  readCount = 0;

  override async isAvailable($elements?: JQuery): Promise<boolean> {
    return true;
  }

  override readonly outputSchema: Schema = {
    type: "object",
    properties: {
      readCount: {
        type: "number",
      },
      ref: {
        type: "string",
      },
    },
  };

  constructor() {
    super(validateRegistryId("test/root-reader"), "Root Reader");
  }

  async read(root: HTMLElement | Document): Promise<ReaderOutput> {
    this.ref = getReferenceForElement(root as HTMLElement);
    this.readCount++;
    return {
      ref: this.ref,
      readCount: this.readCount,
    };
  }
}
