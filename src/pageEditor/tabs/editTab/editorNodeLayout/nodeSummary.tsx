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

import React, { type ReactElement } from "react";
import { type BrickConfig } from "@/bricks/types";
import CommentEffect from "@/bricks/effects/comment";
import { isNullOrBlank } from "@/utils/stringUtils";

import styles from "./brickSummary.module.scss";

/**
 * Returns a React element to display in the Page Editor brick outline.
 * @param brickConfig the configured brick
 * @since 1.8.5
 */
export function getBrickPipelineNodeSummary(
  brickConfig: BrickConfig,
): ReactElement | undefined {
  // In the future, we might consider defining this on the brick itself, but that would require importing React.
  // Therefore, you'd still want to split the actual component into a different module and dynamically import it
  // from the brick's method.

  if (
    brickConfig.id === CommentEffect.BRICK_ID &&
    !isNullOrBlank(brickConfig.config.comment)
  ) {
    return <div className={styles.comment}>{brickConfig.config.comment}</div>;
  }

  return undefined;
}
