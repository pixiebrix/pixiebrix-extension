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

import { type BrickPipeline, type BrickConfig } from "@/bricks/types";
import { type StarterBrickDefinitionProp } from "@/starterBricks/types";

export type TourConfig = {
  /**
   * The tour pipeline to run
   * @since 1.7.19
   */
  tour: BrickPipeline | BrickConfig;
};

export interface TourDefinition extends StarterBrickDefinitionProp {
  defaultOptions?: UnknownObject;

  /**
   * Automatically run the tour on matching pages.
   * @since 1.7.19
   */
  autoRunSchedule?: "never" | "once" | "always";

  /**
   * Allow the user to manually run the tour. Causes the tour to be available in the Quick Bar.
   * @since 1.7.19
   */
  allowUserRun?: boolean;
}
