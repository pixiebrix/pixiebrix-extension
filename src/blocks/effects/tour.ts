/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { attachStylesheet } from "@/blocks/util";
import stylesheetUrl from "@/vendors/intro.js/introjs.scss?loadAsUrl";
import { $safeFind } from "@/helpers";
import pDefer from "p-defer";
import { BusinessError, CancelError } from "@/errors/businessErrors";

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

// `true` if there is currently a tour in progress on the page
let tourInProgress = false;

export class TourEffect extends Effect {
  constructor() {
    super("@pixiebrix/tour", "Show Tour", "Show step-by-step tour");
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
    },
    ["steps"]
  );

  async effect({
    showProgress = false,
    showBullets = true,
    disableInteraction = false,
    steps = [] as Step[],
  }: BlockArg): Promise<void> {
    const stylesheetLink = await attachStylesheet(stylesheetUrl);

    const removeStylesheet = () => {
      stylesheetLink.remove();
    };

    const { default: introJs } = await import(
      /* webpackChunkName: "intro.js" */ "intro.js"
    );

    const { resolve, reject, promise: tourPromise } = pDefer();

    try {
      if (tourInProgress) {
        throw new BusinessError("A tour is already in progress");
      }

      const [firstStep] = steps as Step[];
      if ($safeFind(firstStep.element).length === 0) {
        throw new BusinessError(
          "No matching element found for first step in tour"
        );
      }

      tourInProgress = true;

      introJs()
        .setOptions({
          showProgress,
          showBullets,
          disableInteraction,
          steps: (steps as Step[]).map(({ element, ...rest }) => ({
            ...rest,
            element: $safeFind(element).get(0),
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

      await tourPromise;
    } finally {
      tourInProgress = false;
    }
  }
}
