/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Renderer } from "@/types";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, RenderedHTML } from "@/core";
import yaml from "js-yaml";
import { getComponent } from "./documentView";

export class DocumentRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/document",
      "Render Document",
      "Render Document to sanitized HTML"
    );
  }

  inputSchema = propertiesToSchema(
    {
      body: {
        type: "string",
        description: "The Document config to render",
        format: "markdown",
      },
    },
    ["body"]
  );

  async render({ body }: BlockArg): Promise<RenderedHTML> {
    const bodyObj =
      typeof body === "string"
        ? yaml.load(body, { schema: yaml.DEFAULT_SCHEMA })
        : body;

    const { Component, props } = getComponent(bodyObj);

    return {
      Component,
      props,
    } as any;
  }
}
