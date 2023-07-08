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

import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import CustomEventEffect from "@/blocks/effects/customEvent";
import CollectEventNamesAnalysis from "@/analysis/analysisVisitors/eventNameAnalysis/collectEventNamesAnalysis";
import { makeTemplateExpression } from "@/runtime/expressionCreators";

describe("collectEventNamesAnalysis", () => {
  it("collects event name from literal", () => {
    const formState = formStateFactory();
    formState.extension.blockPipeline[0] = {
      id: CustomEventEffect.BRICK_ID,
      config: {
        eventName: "foo",
      },
    };

    const analysis = new CollectEventNamesAnalysis();
    analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([]);
    expect(analysis.result).toEqual({
      knownNames: ["foo"],
      hasDynamicEventName: false,
    });
  });

  it("collects event name from template literal", () => {
    const formState = formStateFactory();
    formState.extension.blockPipeline[0] = {
      id: CustomEventEffect.BRICK_ID,
      config: {
        eventName: makeTemplateExpression("nunjucks", "foo"),
      },
    };

    const analysis = new CollectEventNamesAnalysis();
    analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([]);
    expect(analysis.result).toEqual({
      knownNames: ["foo"],
      hasDynamicEventName: false,
    });
  });

  it("sets dynamic event flag", () => {
    const formState = formStateFactory();
    formState.extension.blockPipeline[0] = {
      id: CustomEventEffect.BRICK_ID,
      config: {
        eventName: makeTemplateExpression("nunjucks", "{{ @foo }}"),
      },
    };

    const analysis = new CollectEventNamesAnalysis();
    analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([]);
    expect(analysis.result).toEqual({
      knownNames: [],
      hasDynamicEventName: true,
    });
  });
});
