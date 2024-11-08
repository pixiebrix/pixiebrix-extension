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

import { TransformerABC } from "../../types/bricks/transformerTypes";
import {
  type TemplateEngine,
  type BrickArgs,
  type BrickOptions,
} from "../../types/runtimeTypes";
import { type Schema } from "../../types/schemaTypes";
import Mustache from "mustache";
import { BusinessError } from "../../errors/businessErrors";
import { propertiesToSchema } from "../../utils/schemaUtils";

/**
 * Transformer that fills a template using the current context.
 */
export class TemplateTransformer extends TransformerABC {
  override defaultOutputKey = "filled";

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/template",
      "Fill template",
      "Fill in a template using the current context",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      template: {
        type: "string",
        description: "The template to render",
      },
      templateEngine: {
        type: "string",
        enum: ["mustache"],
        default: "mustache",
      },
    },
    ["template"],
  );

  async transform(
    {
      template,
      templateEngine = "mustache",
    }: BrickArgs<{ template: string; templateEngine: TemplateEngine }>,
    { ctxt }: BrickOptions,
  ): Promise<unknown> {
    if (templateEngine !== "mustache") {
      throw new BusinessError(
        "Only 'mustache' is currently supported for templateEngine",
      );
    }

    return Mustache.render(template, ctxt);
  }
}
