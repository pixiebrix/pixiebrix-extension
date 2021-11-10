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
import { CancelError } from "@/errors";

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
    const introJs = (await import("intro.js")).default;

    return new Promise((resolve, reject) => {
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
          resolve();
        })
        .onexit(() => {
          reject(new CancelError("User cancelled the tour"));
        })
        .start();
    });
  }
}
