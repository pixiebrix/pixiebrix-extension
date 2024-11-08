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

import { type BrickPipeline } from "@/bricks/types";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import { BrickTypes } from "../../../../../runtime/runtimeTypes";
import { useCallback } from "react";

type LastBrickInfo = {
  lastIndex: number;
  showAppend: boolean;
};

export function useGetLastBrickHandling() {
  const { data: allBricks } = useTypedBrickMap();

  return useCallback(
    (pipeline: BrickPipeline): LastBrickInfo => {
      const lastIndex = pipeline.length - 1;
      const lastBrickId = pipeline.at(lastIndex)?.id;
      const lastBrick = lastBrickId ? allBricks?.get(lastBrickId) : undefined;

      // Don't show append if the last brick is a renderer
      const showAppend =
        !lastBrick?.block || lastBrick.type !== BrickTypes.RENDERER;

      return {
        lastIndex,
        showAppend,
      };
    },
    [allBricks],
  );
}
