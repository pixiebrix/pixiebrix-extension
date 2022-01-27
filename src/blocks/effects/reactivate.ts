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

import { Effect, UnknownObject } from "@/types";
import { BlockArg, BlockOptions, Schema } from "@/core";
import { reactivateTab } from "@/contentScript/lifecycle";
import { expectContext } from "@/utils/expectContext";

export class ReactivateEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/reactivate",
      "Reactivate All",
      "Reactivate PixieBrix enhancements, e.g., because page content has changed without a navigation event"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {},
  };

  async effect(
    arg: BlockArg<UnknownObject>,
    { logger }: BlockOptions
  ): Promise<void> {
    expectContext("contentScript");
    console.debug("Sending reactivateTab signal");
    logger.debug("Sending reactivateTab signal");
    await reactivateTab();
  }
}
