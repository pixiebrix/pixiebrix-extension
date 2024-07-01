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

import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { runSubTour } from "@/starterBricks/tour/tourController";
import { BusinessError } from "@/errors/businessErrors";
import { propertiesToSchema } from "@/utils/schemaUtils";

export class RunSubTourEffect extends EffectABC {
  constructor() {
    super(
      "@pixiebrix/tour/run",
      "Run Sub-tour",
      "Run a tour from the same mod",
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      tour: {
        type: "string",
        description: "The name of the tour to run",
      },
    },
    ["tour"],
  );

  async effect(
    { tour }: BrickArgs<{ tour: string }>,
    { logger }: BrickOptions,
  ): Promise<void> {
    if (logger.context.modId == null) {
      throw new BusinessError("Can only run sub-tours in the same mod");
    }

    // XXX: do we need affordance cancel this using abortSignal from BrickOptions? Probably not for now, because
    // manually running a tour will cancel all tours in progress (see tourController.ts)
    await runSubTour({
      tour,
      blueprintId: logger.context.modId,
    });
  }
}
