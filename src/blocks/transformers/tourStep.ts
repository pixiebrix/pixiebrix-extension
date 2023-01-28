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

import { Transformer } from "@/types";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import injectStylesheet from "@/utils/injectStylesheet";
import stylesheetUrl from "@/vendors/intro.js/introjs.scss?loadAsUrl";
import pDefer from "p-defer";
import {
  CancelError,
  NoElementsFoundError,
  PropError,
} from "@/errors/businessErrors";
import { type PipelineExpression } from "@/runtime/mapArgs";
import { validateRegistryId } from "@/types/helpers";
import { isEmpty } from "lodash";
import { awaitElement } from "@/blocks/effects/wait";
import { findSingleElement } from "@/utils/requireSingleElement";

type Step = {
  title: string;
  body: string | PipelineExpression;

  onBeforeShow?: PipelineExpression;

  onAfterShow?: PipelineExpression;

  selector: string;
  appearance?: {
    disableInteraction?: boolean;
    skippable?: boolean;
    wait?: {
      maxWaitMillis: number;
    };
    highlight?: {
      backgroundColor: string;
    };
    popover?: {
      position?:
        | "right"
        | "left"
        | "bottom"
        | "top"
        | "bottom-left-aligned"
        | "bottom-middle-aligned"
        | "bottom-right-aligned"
        | "auto";
    };
  };
};

export class TourStepTransformer extends Transformer {
  static BLOCK_ID = validateRegistryId("@pixiebrix/tour/step");

  constructor() {
    super(
      TourStepTransformer.BLOCK_ID,
      "Show Tour Step",
      "Show a step in a tour"
    );
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  async showIntroJsStep(
    element: HTMLElement,
    { appearance, title, body }: Step,
    { abortSignal }: BlockOptions
  ): Promise<unknown> {
    const stylesheetLink = await injectStylesheet(stylesheetUrl);

    const removeStylesheet = () => {
      stylesheetLink.remove();
    };

    const { default: introJs } = await import(
      /* webpackChunkName: "intro.js" */ "intro.js"
    );

    const { resolve, reject, promise: tourPromise } = pDefer();

    const tour = introJs()
      .setOptions({
        showProgress: false,
        showBullets: false,
        disableInteraction: appearance.disableInteraction,
        // Scroll is implemented by the brick
        scrollToElement: false,
        steps: [
          {
            element,
            title,
            intro: body as string,
          },
        ],
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

    abortSignal?.addEventListener("abort", () => {
      tour.exit(true);
    });

    return tourPromise;
  }

  /**
   * The original style of the target element before it was highlighted as part of the tour step.
   */
  originalStyle: Record<string, string> = undefined;

  async locateElement(args: Step, options: BlockOptions): Promise<HTMLElement> {
    if (args.appearance?.wait) {
      try {
        const $elements = await awaitElement({
          selector: args.selector,
          $root: $(options.root),
          maxWaitMillis: args.appearance.wait.maxWaitMillis,
          abortSignal: options.abortSignal,
        });

        return $elements.get(0) as HTMLElement;
      } catch {
        return null;
      }
    }

    return findSingleElement(args.selector, options.root);
  }

  highlightTarget(
    element: HTMLElement,
    config: Step["appearance"]["highlight"]
  ): void {
    if (config == null) {
      return;
    }

    this.originalStyle = {
      backgroundColor: element.style.backgroundColor,
    };

    element.style.backgroundColor = config.backgroundColor;
  }

  unhighlightTarget(element: HTMLElement): void {
    if (this.originalStyle) {
      element.style.backgroundColor = this.originalStyle.backgroundColor;
    }
  }

  inputSchema: Schema = propertiesToSchema(
    {
      title: {
        type: "string",
        description: "Step title",
      },
      selector: {
        type: "string",
        format: "selector",
        description: "An optional selector for the target element",
      },
      body: {
        oneOf: [
          {
            type: "string",
            description: "Content of the step, supports markdown",
            format: "markdown",
          },
          {
            $ref: "https://app.pixiebrix.com/schemas/pipeline#",
            description: "A renderer pipeline to generate the step content",
          },
        ],
      },
      onBeforeShow: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "Actions to perform before showing the step",
      },
      onAfterShow: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "Actions to perform after showing the step",
      },
      appearance: {
        type: "object",
        properties: {
          wait: {
            type: "object",
            properties: {
              maxWaitMillis: {
                type: "number",
                description:
                  "Maximum time to wait in milliseconds. If the value is less than or equal to zero, will wait indefinitely",
              },
            },
          },
          skippable: {
            type: "boolean",
            default: false,
            description: "Skip the step if the target element is not found",
          },
          disableInteraction: {
            type: "boolean",
            default: false,
            description:
              "When an element is highlighted, users can interact with the underlying element. To disable this behavior set disableInteraction to true",
          },
          highlight: {
            type: "object",
            properties: {
              backgroundColor: {
                type: "string",
                description: "An optional color to highlight the element with",
              },
            },
          },
          scroll: {
            type: "object",
            properties: {
              behavior: {
                type: "string",
                enum: ["auto", "smooth"],
                default: "auto",
                description: "Defines the transition animation",
              },
            },
          },
          popover: {
            type: "object",
            properties: {
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
          },
        },
      },
    },
    ["title", "body"]
  );

  async transform(
    args: BlockArg<Step>,
    options: BlockOptions
  ): Promise<unknown> {
    const { root } = options;
    const { body, selector, onAfterShow, onBeforeShow, appearance = {} } = args;

    const target = selector ? await this.locateElement(args, options) : root;

    if (target === document) {
      throw new PropError(
        "Tour step cannot target the document",
        this.id,
        "selector",
        selector
      );
    }

    if (target == null) {
      if (appearance.skippable) {
        // Skip because not found
        return {};
      }

      throw new NoElementsFoundError(
        selector,
        "Target element not available on the page"
      );
    }

    const targetElement = target as HTMLElement;

    this.highlightTarget(targetElement, appearance.highlight);

    try {
      if (!isEmpty(onBeforeShow?.__value__)) {
        await options.runPipeline(
          onBeforeShow.__value__ ?? [],
          {
            key: "onBeforeShow",
            counter: 0,
          },
          {},
          targetElement
        );
      }

      if (typeof body === "string") {
        await this.showIntroJsStep(targetElement, args, options);
      } else {
        throw new TypeError("Not implemented yet.");
      }

      if (!isEmpty(onAfterShow?.__value__)) {
        await options.runPipeline(
          onAfterShow.__value__ ?? [],
          {
            key: "onAfterShow",
            counter: 0,
          },
          {},
          targetElement
        );
      }
    } finally {
      this.unhighlightTarget(targetElement);
    }

    return {};
  }
}

export default TourStepTransformer;
