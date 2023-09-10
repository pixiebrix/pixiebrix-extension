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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { propertiesToSchema } from "@/validators/generic";
import { applyJq } from "@/sandbox/messenger/executor";
import { range } from "lodash";

export class ConcurrentJqTransformer extends TransformerABC {
  override async isPure(): Promise<boolean> {
    return true;
  }

  constructor() {
    super(
      "@pixiebrix/concurrent-jq",
      "Concurrent jq - Smoke Test",
      "Smoke test for running concurrent jq calls",
      "faCode"
    );
  }

  inputSchema = propertiesToSchema({});

  async transform() {
    await Promise.all(
      range(3000).map(async () =>
        applyJq({
          input: { foo: { bar: { baz: "qux" } } },
          filter: ".foo.bar.baz",
        })
      )
    );
  }
}
