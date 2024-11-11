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

import {
  formStateFactory,
  triggerFormStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import CustomEventEffect from "@/bricks/effects/customEvent";
import CollectEventNamesVisitor from "@/analysis/analysisVisitors/eventNameAnalysis/collectEventNamesVisitor";

import { toExpression } from "@/utils/expressionUtils";

describe("collectEventNamesAnalysis", () => {
  it("collects event name from literal", () => {
    const formState = formStateFactory();
    formState.modComponent.brickPipeline[0] = {
      id: CustomEventEffect.BRICK_ID,
      config: {
        eventName: "foo",
      },
    };

    const result = CollectEventNamesVisitor.collectNames(formState);

    expect(result).toEqual({
      knownTriggerNames: [],
      knownEmittedNames: ["foo"],
      hasDynamicEventName: false,
    });
  });

  it("collects event name from template literal", () => {
    const formState = formStateFactory();
    formState.modComponent.brickPipeline[0] = {
      id: CustomEventEffect.BRICK_ID,
      config: {
        eventName: toExpression("nunjucks", "foo"),
      },
    };

    const result = CollectEventNamesVisitor.collectNames(formState);

    expect(result).toEqual({
      knownTriggerNames: [],
      knownEmittedNames: ["foo"],
      hasDynamicEventName: false,
    });
  });

  it("sets dynamic event flag", () => {
    const formState = formStateFactory();
    formState.modComponent.brickPipeline[0] = {
      id: CustomEventEffect.BRICK_ID,
      config: {
        eventName: toExpression("nunjucks", "{{ @foo }}"),
      },
    };

    const result = CollectEventNamesVisitor.collectNames(formState);

    expect(result).toEqual({
      knownTriggerNames: [],
      knownEmittedNames: [],
      hasDynamicEventName: true,
    });
  });

  it("collects custom trigger names from trigger starter bricks", () => {
    const formState = triggerFormStateFactory();
    formState.starterBrick.definition.trigger = "custom";
    formState.starterBrick.definition.customEvent = {
      eventName: "foo",
    };

    const result = CollectEventNamesVisitor.collectNames(formState);

    expect(result).toEqual({
      knownTriggerNames: ["foo"],
      knownEmittedNames: [],
      hasDynamicEventName: false,
    });
  });
});
