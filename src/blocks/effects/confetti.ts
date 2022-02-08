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

import { Effect } from "@/types";
import { BlockOptions, Schema } from "@/core";
import { recordLog } from "@/background/messenger/api";

export class ConfettiEffect extends Effect {
  constructor() {
    super("@pixiebrix/confetti", "Show Confetti", "Shows some confetti");
  }

  inputSchema: Schema = {
    type: "object",
    properties: {},
  };

  async effect(_, env?: BlockOptions): Promise<void> {
    const {
      default: confetti,
      // @ts-expect-error no existing definitions exist
    } = await import(/* webpackChunkName: "confetti" */ "canvas-confetti");

    recordLog(env.logger.context, "error", "Testing error.", null);

    // https://www.kirilv.com/canvas-confetti/
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }
}
