/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { Transformer } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import Mustache from "mustache";
import { BusinessError } from "@/errors";

/**
 * Transformer that fills a template using the current context.
 */
export class TemplateTransformer extends Transformer {
  defaultOutputKey = "filled";

  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/template",
      "Fill template",
      "Fill in a template using the current context",
      "faCode"
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
    ["template"]
  );

  async transform(
    { template, templateEngine = "mustache" }: BlockArg,
    { ctxt }: BlockOptions
  ): Promise<unknown> {
    if (templateEngine !== "mustache") {
      throw new BusinessError(
        "Only 'mustache' is currently supported for templateEngine"
      );
    }

    return Mustache.render(template, ctxt);
  }
}
