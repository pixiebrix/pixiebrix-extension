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
import CheckEventNamesAnalysis from "@/analysis/analysisVisitors/eventNameAnalysis/checkEventNamesAnalysis";
import CustomEventEffect from "@/bricks/effects/customEvent";
import { AnnotationType } from "@/types/annotationTypes";

import { toExpression } from "@/utils/expressionUtils";

describe("checkEventNamesAnalysis", () => {
  it("error on missing custom event", async () => {
    const formState = triggerFormStateFactory();
    formState.starterBrick.definition.trigger = "custom";

    const analysis = new CheckEventNamesAnalysis([formState]);
    await analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([
      expect.objectContaining({
        type: AnnotationType.Error,
      }),
    ]);
  });

  it.each(["click"])("allow dom event: %s", async (eventName) => {
    const formState = triggerFormStateFactory();
    formState.starterBrick.definition.trigger = "custom";
    formState.starterBrick.definition.customEvent = { eventName };

    const analysis = new CheckEventNamesAnalysis([formState]);
    await analysis.run(formState);

    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  it("warn on unknown event", async () => {
    const formState = triggerFormStateFactory();
    formState.starterBrick.definition.trigger = "custom";
    formState.starterBrick.definition.customEvent = { eventName: "unknown" };

    const analysis = new CheckEventNamesAnalysis([formState]);
    await analysis.run(formState);

    expect(analysis.getAnnotations()).toEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
      }),
    ]);
  });

  it("allow known event", async () => {
    const triggerFormState = triggerFormStateFactory();
    triggerFormState.starterBrick.definition.trigger = "custom";
    triggerFormState.starterBrick.definition.customEvent = {
      eventName: "myevent",
    };

    const otherFormState = formStateFactory({}, [
      { id: CustomEventEffect.BRICK_ID, config: { eventName: "myevent" } },
    ]);

    const analysis = new CheckEventNamesAnalysis([
      triggerFormState,
      otherFormState,
    ]);
    await analysis.run(triggerFormState);

    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  it("info on unknown event with dynamic expressions", async () => {
    const triggerFormState = triggerFormStateFactory();
    triggerFormState.starterBrick.definition.trigger = "custom";
    triggerFormState.starterBrick.definition.customEvent = {
      eventName: "myevent",
    };

    const otherFormState = formStateFactory({}, [
      {
        id: CustomEventEffect.BRICK_ID,
        config: {
          eventName: toExpression("nunjucks", "{{@myevent}}"),
        },
      },
    ]);

    const analysis = new CheckEventNamesAnalysis([
      triggerFormState,
      otherFormState,
    ]);
    await analysis.run(triggerFormState);

    expect(analysis.getAnnotations()).toEqual([
      expect.objectContaining({
        type: AnnotationType.Info,
      }),
    ]);
  });

  it("get knownEventNames() combines known and trigger names", async () => {
    const triggerFormState = triggerFormStateFactory();
    triggerFormState.starterBrick.definition.trigger = "custom";
    triggerFormState.starterBrick.definition.customEvent = {
      eventName: "myevent",
    };

    const otherFormState = formStateFactory({}, [
      {
        id: CustomEventEffect.BRICK_ID,
        config: {
          eventName: "myevent2",
        },
      },
    ]);

    const analysis = new CheckEventNamesAnalysis([
      triggerFormState,
      otherFormState,
    ]);

    await analysis.run(triggerFormState);

    expect(analysis.knownEventNames).toEqual(
      expect.arrayContaining(["myevent", "myevent2"]),
    );
  });
});
