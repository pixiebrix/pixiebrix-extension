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
import { BlockArg, RenderedHTML, Schema } from "@/core";

const LAYOUT_SCHEMA: Schema = {
  description: "The layout definition",
};

export class LayoutRenderer extends Renderer {
  constructor() {
    super(
      "@pixiebrix/layout",
      "Layout Renderer",
      "Render a layout that embed other bricks"
    );
  }

  inputSchema = propertiesToSchema({
    layout: LAYOUT_SCHEMA,
  });

  async render({ layout }: BlockArg): Promise<RenderedHTML> {}
}
