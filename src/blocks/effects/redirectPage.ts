/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema } from "@/core";

const URL_INPUT_SPEC: Schema = {
  $schema: "https://json-schema.org/draft/2019-09/schema#",
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "The URL to redirect to",
      format: "uri",
    },
    params: {
      type: "object",
      description: "URL parameters, will be encoded",
      additionalProperties: { type: "string" },
    },
  },
  required: ["url"],
};

function makeURL(
  url: string,
  params: { [key: string]: string } | undefined
): string {
  const result = new URL(url);
  for (const [name, value] of Object.entries(params ?? {})) {
    result.searchParams.append(name, value);
  }
  return result.toString();
}

export class NavigateURLEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/location",
      "Redirect Page",
      "Navigate the current page to a URL",
      "faWindowMaximize"
    );
  }

  inputSchema = URL_INPUT_SPEC;

  async effect({ url, params }: BlockArg): Promise<void> {
    document.location.href = makeURL(url, params);
  }
}

export class OpenURLEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/open-tab",
      "Open a Tab",
      "Open a URL in a new tab",
      "faWindowMaximize"
    );
  }

  inputSchema = URL_INPUT_SPEC;

  async effect({ url, params }: BlockArg): Promise<void> {
    const newWindow = window.open(
      makeURL(url, params),
      "_blank",
      "noopener,noreferrer"
    );
    // since we're the content script, we shouldn't actually get a window handle back
    if (newWindow) {
      newWindow.opener = null;
      newWindow.focus();
    }
  }
}

registerBlock(new OpenURLEffect());
registerBlock(new NavigateURLEffect());
