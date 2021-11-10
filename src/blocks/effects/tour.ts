/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { BusinessError, CancelError } from "@/errors";

import stylesheetUrl from "intro.js/introjs.css?loadAsUrl";
import darkThemeUrl from "intro.js/themes/introjs-dark.css?loadAsUrl";
import { attachStylesheet } from "@/blocks/util";

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

function prefersDarkMode(): boolean {
  // https://flaviocopes.com/javascript-detect-dark-mode/
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

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
    const stylesheetLink = attachStylesheet(stylesheetUrl);
    // NOTE: this detects if the user prefers dark mode, which is a likely indicator of whether or not a dark theme is
    // currently being used on the site. In the future, we'll want to detect whether or not a dark them is active and
    // use that as the basis for the determination. (e.g., by checking the default font color on the body)
    const darkThemeLink = prefersDarkMode()
      ? attachStylesheet(darkThemeUrl)
      : null;

    const removeStylesheets = () => {
      stylesheetLink.remove();
      darkThemeLink?.remove();
    };

    const introJs = (await import("intro.js")).default;

    // We weren't seeing a FOUC: https://webkit.org/blog/66/the-fouc-problem/. But make sure the CSS sheet is available
    // before starting a tour.
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });

    return new Promise<void>((resolve, reject) => {
      if (tourInProgress) {
        throw new BusinessError("A tour is already in progress");
      }

      const [firstStep] = steps as Step[];
      if ($(document).find(firstStep.element).length === 0) {
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
            element: $(document).find(element).get(0),
          })),
        })
        .oncomplete(() => {
          // Put here instead of `finally` below because the tourInProgress error shouldn't cause the link to be removed
          removeStylesheets();
          resolve();
        })
        .onexit(() => {
          // Put here instead of `finally` below because the tourInProgress error shouldn't cause the link to be removed
          removeStylesheets();
          reject(new CancelError("User cancelled the tour"));
        })
        .start();
    }).finally(() => {
      tourInProgress = false;
    });
  }
}
