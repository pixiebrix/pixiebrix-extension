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
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { $safeFind } from "@/helpers";

export class FormData extends Transformer {
  defaultOutputKey = "form";

  constructor() {
    super(
      "@pixiebrix/forms/data",
      "Read data from a form",
      "Read data from all inputs on a form"
    );
  }

  async isPure(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema({
    selector: {
      type: "string",
      description: "JQuery selector for the form",
    },
  });

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    additionalProperties: true,
  };

  async transform({ selector }: BlockArg): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    $safeFind(selector)
      .find(":input")
      .each(function () {
        const name = $(this).attr("name") ?? "";
        if (name !== "") {
          result[name] = $(this).val();
        }
      });
    return result;
  }
}
