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

import { type BrickConfig, type BrickPosition } from "../../../bricks/types";
import PipelineVisitor, {
  type VisitBlockExtra,
} from "../../../bricks/PipelineVisitor";
import CustomEventEffect from "../../../bricks/effects/customEvent";
import { castTextLiteralOrThrow } from "../../../utils/expressionUtils";
import {
  isTriggerStarterBrick,
  type ModComponentFormState,
} from "../../../pageEditor/starterBricks/formStateTypes";

export type EventNameAnalysisResult = {
  /**
   * Statically known emitted event names in the FormState.
   */
  knownEmittedNames: string[];
  /**
   * Event names that are used by a trigger starter brick.
   * Kept separate to preserve warnings in the trigger starter brick when the event name is not emitted from another brick.
   * Combined with knownEmittedNames to get all known event names to set in redux.
   * @since 1.8.2
   */
  knownTriggerNames: string[];
  /**
   * True if the FormState uses a dynamic event name, e.g., variable or text template expression.
   */
  hasDynamicEventName: boolean;
};

/**
 * Visitor to collect all events fired by a single FormState.
 * @since 1.7.34
 */
class CollectEventNamesVisitor extends PipelineVisitor {
  readonly _eventNames = new Set<string>();
  readonly _triggerNames = new Set<string>();
  private _hasDynamicEventName = false;

  public get result(): EventNameAnalysisResult {
    return {
      knownEmittedNames: [...this._eventNames],
      knownTriggerNames: [...this._triggerNames],
      hasDynamicEventName: this._hasDynamicEventName,
    };
  }

  private visitStarterBrick(
    starterBrick: ModComponentFormState["starterBrick"],
  ) {
    if (isTriggerStarterBrick(starterBrick)) {
      const eventName = starterBrick.definition.customEvent?.eventName;

      if (eventName) {
        this._triggerNames.add(eventName);
      }
    }
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
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

  static collectNames(
    formState: ModComponentFormState,
  ): EventNameAnalysisResult {
    const visitor = new CollectEventNamesVisitor();

    visitor.visitRootPipeline(formState.modComponent.brickPipeline);
    visitor.visitStarterBrick(formState.starterBrick);

    return visitor.result;
  }
}

export default CollectEventNamesVisitor;
