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

import { Effect } from "@/types";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import injectStylesheet from "@/utils/injectStylesheet";
import stylesheetUrl from "@/vendors/intro.js/introjs.scss?loadAsUrl";
import { $safeFind } from "@/helpers";
import pDefer from "p-defer";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { IS_ROOT_AWARE_BRICK_PROPS } from "@/blocks/rootModeHelpers";
import {
  isTourInProgress,
  markTourEnd,
  markTourStart,
} from "@/extensionPoints/tourController";

type Step = {
  title: string;
  intro: string;
  element: string;
  position:
    | "right"
    | "left"
    | "bottom"
    | "top"
    | "bottom-left-aligned"
    | "bottom-middle-aligned"
    | "bottom-right-aligned"
    | "auto";
};

export class TourEffect extends Effect {
  constructor() {
    super("@pixiebrix/tour", "Show Tour", "Show step-by-step tour");
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
          required: ["element", "intro"],
          minItems: 1,
        },
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    ["steps"]
  );

  async effect(
    {
      showProgress = false,
      showBullets = true,
      disableInteraction = false,
      steps = [] as Step[],
      isRootAware = false,
    }: BlockArg,
    { root, abortSignal: brickAbortSignal, logger }: BlockOptions
  ): Promise<void> {
    const { extensionId } = logger.context;
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

    try {
      if (isTourInProgress()) {
        throw new BusinessError("A tour is already in progress");
      }

      const [firstStep] = steps as Step[];
      if ($safeFind(firstStep.element, $root).length === 0) {
        throw new BusinessError(
          "No matching element found for first step in tour"
        );
      }

      markTourStart({ id: extensionId }, abortController);

      const tour = introJs()
        .setOptions({
          showProgress,
          showBullets,
          disableInteraction,
          steps: (steps as Step[]).map(({ element, ...rest }) => ({
            ...rest,
            element: $safeFind(element, $root).get(0),
          })),
        })
        .oncomplete(() => {
          // Put here instead of `finally` below because the tourInProgress error shouldn't cause the link to be removed
          removeStylesheet();
          resolve();
        })
        .onexit(() => {
          // Put here instead of `finally` below because the tourInProgress error shouldn't cause the link to be removed
          removeStylesheet();
          reject(new CancelError("User cancelled the tour"));
        })
        .start();

      abortController.signal.addEventListener("abort", () => {
        tour.exit(true);
      });

      brickAbortSignal?.addEventListener("abort", () => {
        tour.exit(true);
      });

      await tourPromise;
      markTourEnd({ id: extensionId });
    } catch (error) {
      markTourEnd({ id: extensionId }, { error });
    }
  }
}
