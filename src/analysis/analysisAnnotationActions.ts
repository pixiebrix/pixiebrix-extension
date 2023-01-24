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

import { type UUID } from "@/core";
import { type AnalysisAnnotationAction } from "@/analysis/analysisTypes";
import { type Except } from "type-fest";
import { uuidv4 } from "@/types/helpers";

type ActionHandler = () => Promise<void>;

const extraActionHandlers: Record<UUID, ActionHandler> = {};

export function createAnalysisAnnotationAction(
  action: Except<AnalysisAnnotationAction, "annotationActionId">,
  callback?: () => Promise<void>
): AnalysisAnnotationAction {
  const annotationActionId = uuidv4();

  if (callback) {
    // eslint-disable-next-line security/detect-object-injection -- uuid
    extraActionHandlers[annotationActionId] = callback;
  }

  return {
    annotationActionId,
    ...action,
  };
}

export function getCallbackForAnalysisAction(
  analysisActionId: UUID
): ActionHandler | null {
  // eslint-disable-next-line security/detect-object-injection -- uuid
  const callback = extraActionHandlers[analysisActionId];

  if (callback) {
    return async () => {
      await callback();
      // eslint-disable-next-line security/detect-object-injection -- uuid
      delete extraActionHandlers[analysisActionId];
    };
  }

  return null;
}
