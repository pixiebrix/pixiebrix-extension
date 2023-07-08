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

import { AnalysisVisitorABC } from "@/analysis/analysisVisitors/baseAnalysisVisitors";
import { type BrickConfig, type BrickPosition } from "@/blocks/types";
import { type VisitBlockExtra } from "@/blocks/PipelineVisitor";
import CustomEventEffect from "@/blocks/effects/customEvent";
import { castTextLiteralOrThrow } from "@/utils/expressionUtils";

export type EventNameAnalysisResult = {
  /**
   * Statically known event names in the FormState.
   */
  knownNames: string[];
  /**
   * True if the FormState uses a dynamic event name, e.g., variable or text template expression.
   */
  hasDynamicEventName: boolean;
};

/**
 * Analysis visitor to collect all events fired by a single FormState.
 * @since 1.7.34
 */
class CollectEventNamesAnalysis extends AnalysisVisitorABC {
  readonly _eventNames = new Set<string>();
  private _hasDynamicEventName = false;

  get id() {
    return "eventNamesCollector";
  }

  public get result(): EventNameAnalysisResult {
    return {
      knownNames: [...this._eventNames],
      hasDynamicEventName: this._hasDynamicEventName,
    };
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra
  ): void {
    super.visitBrick(position, blockConfig, extra);

    if (blockConfig.id === CustomEventEffect.BRICK_ID) {
      try {
        const eventName = castTextLiteralOrThrow(blockConfig.config.eventName);

        if (eventName) {
          this._eventNames.add(eventName);
        }
      } catch {
        this._hasDynamicEventName = true;
      }
    }
  }
}

export default CollectEventNamesAnalysis;
