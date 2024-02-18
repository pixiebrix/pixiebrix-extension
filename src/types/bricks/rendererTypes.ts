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

import { BrickABC } from "@/types/brickTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type RendererOutput,
} from "@/types/runtimeTypes";
import type { PlatformCapability } from "@/platform/capabilities";

export abstract class RendererABC extends BrickABC {
  abstract render(
    inputs: BrickArgs,
    options: BrickOptions,
  ): Promise<RendererOutput>;

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["dom"];
  }

  override async isRootAware(): Promise<boolean> {
    // Most renderers don't use the root, so have them opt-in
    return false;
  }

  async run(value: BrickArgs, options: BrickOptions): Promise<RendererOutput> {
    return this.render(value, options);
  }
}
