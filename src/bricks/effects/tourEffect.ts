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

import { EffectABC } from "@/types/bricks/effectTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import injectStylesheet from "@/utils/injectStylesheet";
import stylesheetUrl from "@/vendors/intro.js/introjs.scss?loadAsUrl";
import pDefer from "p-defer";
import { BusinessError, CancelError, PropError } from "@/errors/businessErrors";
import { IS_ROOT_AWARE_BRICK_PROPS } from "@/bricks/rootModeHelpers";
import { validateRegistryId } from "@/types/helpers";
import { isEmpty } from "lodash";
import { $safeFind } from "@/utils/domUtils";
import { type TooltipPosition } from "intro.js/src/core/steps";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

type Step = {
  title: string;
  intro: string;
  element: string;
  position: TooltipPosition;
};

export class TourEffect extends EffectABC {
  static readonly BLOCK_ID = validateRegistryId("@pixiebrix/tour");

  constructor() {
    super(TourEffect.BLOCK_ID, "Show Tour", "Show step-by-step tour");
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      showProgress: {
        type: "boolean",
        default: false,
        description: "Show a progress bar",
      },
      showBullets: {
        type: "boolean",
        default: true,
        description: "Show step bullets",
      },
      disableInteraction: {
        type: "boolean",
        default: false,
        description:
          "When an element is highlighted, users can interact with the underlying element. To disable this behavior set disableInteraction to true",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Step title",
            },
            intro: {
              type: "string",
              description: "Step content",
            },
            element: {
              type: "string",
              format: "selector",
              description: "Element to highlight for this step",
            },
            position: {
              type: "string",
              enum: [
                "right",
                "left",
                "bottom",
                "top",
                "bottom-left-aligned",
                "bottom-middle-aligned",
                "bottom-right-aligned",
                "auto",
              ],
              default: "auto",
            },
          },
          required: ["intro"],
          minItems: 1,
        },
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    ["steps"],
  );

  async effect(
    {
      showProgress = false,
      showBullets = true,
      disableInteraction = false,
      steps = [] as Step[],
      isRootAware = false,
    }: BrickArgs<{
      showProgress?: boolean;
      showBullets?: boolean;
      disableInteraction?: boolean;
      steps?: Step[];
      isRootAware?: boolean;
    }>,
    { root = document, abortSignal: brickAbortSignal }: BrickOptions,
  ): Promise<void> {
    if (steps.length === 0) {
      throw new PropError(
        "Must provide at least one step",
        this.id,
        "steps",
        steps,
      );
    }

    const abortController = new AbortController();
    const stylesheetLink = await injectStylesheet(stylesheetUrl);

    // NOTE: we're not using $safeFindElementsWithRootMode in this method because:
    // - it assumes that the selector is a top level prop when generating error messages
    // - Tours will generally have multiple tour stops, so it's expected that the user is providing a selector for each
    //  tour stop. In the future, the user would use the Display Temporary Information brick with location: popover
    //  to show a popover on a single element
    const $root = $(isRootAware ? root : document);

    const removeStylesheet = () => {
      stylesheetLink.remove();
    };

    const { default: introJs } = await import(
      /* webpackChunkName: "intro.js" */ "intro.js"
    );

    const { resolve, reject, promise: tourPromise } = pDefer();

    const [firstStep] = steps;
    assertNotNullish(firstStep, "Must provide at least one step");

    if (
      !isEmpty(firstStep.element) &&
      $safeFind(firstStep.element, $root).length === 0
    ) {
      throw new BusinessError(
        "No matching element found for first step in tour",
      );
    }

    const tour = introJs()
      .setOptions({
        showProgress,
        showBullets,
        disableInteraction,
        steps: steps.map(({ element, ...rest }) => ({
          ...rest,
          element: isEmpty(element)
            ? undefined
            : $safeFind(element, $root).get(0),
        })),
      })
      .oncomplete(() => {
        // Put here instead of `finally` below because the tourInProgress error shouldn't cause the link to be removed
        // because it will break the styling of the tour in progress
        removeStylesheet();
        resolve();
      })
      .onexit(() => {
        // Put here instead of `finally` below because the tourInProgress error shouldn't cause the link to be removed
        // because it will break the styling of the tour in progress
        removeStylesheet();
        reject(new CancelError("User cancelled the tour"));
      });

    // The types are incorrect. start() returns a promise, not the instance
    await tour.start();

    const handleAbort = async () => {
      await tour.exit(true);
    };

    abortController.signal.addEventListener("abort", handleAbort);
    brickAbortSignal?.addEventListener("abort", handleAbort);

    await tourPromise;
  }
}
