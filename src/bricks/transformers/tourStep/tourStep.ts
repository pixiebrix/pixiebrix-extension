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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import {
  BusinessError,
  MultipleElementsFoundError,
  NoElementsFoundError,
} from "@/errors/businessErrors";
import { validateRegistryId } from "@/types/helpers";
import { isEmpty, noop } from "lodash";
import { awaitElement } from "@/bricks/effects/wait";
import { type PanelButton } from "@/types/sidebarTypes";
import {
  getCurrentTour,
  markTourStep,
} from "@/starterBricks/tour/tourController";
import { addOverlay } from "@/bricks/transformers/tourStep/overlay";
import * as UNSAFE_panelController from "@/platform/panels/panelController";
import { AbortPanelAction } from "@/bricks/errors";
import { $safeFind } from "@/utils/domUtils";
import { toExpression } from "@/utils/expressionUtils";
import type {
  RefreshTrigger,
  TemporaryPanelDefinition,
  TemporaryPanelEntryMetadata,
} from "@/platform/panels/panelTypes";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import { expectContext } from "@/utils/expectContext";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { type SetRequired } from "type-fest";
import { assertNotNullish } from "@/utils/nullishUtils";

export type StepInputs = {
  title: string;
  body: string | PipelineExpression;

  isLastStep?: boolean;

  onBeforeShow?: PipelineExpression;

  onAfterShow?: PipelineExpression;

  selector: string;
  appearance?: {
    refreshTrigger?: RefreshTrigger;
    disableInteraction?: boolean;
    showOverlay?: boolean;
    skippable?: boolean;
    controls?: {
      outsideClick?: "none" | "submit" | "cancel";
      closeButton?: "none" | "submit" | "cancel";
      actions?: PanelButton[];
    };
    wait?: {
      maxWaitMillis?: number;
    };
    highlight?: {
      backgroundColor?: string;
    };
    scroll?: {
      behavior?: "auto" | "smooth";
    };
    popover?: {
      placement?:
        | "auto"
        | "auto-start"
        | "auto-end"
        | "top"
        | "top-start"
        | "top-end"
        | "bottom"
        | "bottom-start"
        | "bottom-end"
        | "right"
        | "right-start"
        | "right-end"
        | "left"
        | "left-start"
        | "left-end";
    };
  };
};

export const StepSchema: Schema = propertiesToSchema(
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
    isLastStep: {
      type: "boolean",
      description: "Toggle on to indicate this is the last step in the tour",
      default: false,
    },
    body: {
      oneOf: [
        {
          type: "string",
          description: "Content of the step, supports markdown",
          default: "Step content. **Markdown** is supported.",
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
        refreshTrigger: {
          type: "string",
          enum: ["manual", "statechange"],
          description: "An optional trigger for refreshing the panel",
        },
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
        showOverlay: {
          type: "boolean",
          default: true,
          description: "Apply an overlay to the page when the step is active",
        },
        controls: {
          type: "object",
          properties: {
            outsideClick: {
              type: "string",
              enum: ["none", "submit", "cancel"],
              description:
                'Action to take when the user clicks outside the step. Set to "none" to allow interaction with the target element',
            },
            closeButton: {
              type: "string",
              enum: ["none", "submit", "cancel"],
              description:
                'Action to take when the user clicks close button. Set to "none" to hide the close button',
            },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    examples: ["submit", "cancel"],
                    description: "Action type to resolve the tour step with",
                    default: "submit",
                  },
                  caption: {
                    type: "string",
                    description: "Button caption, or exclude to use the type",
                  },
                  // Leave off for now. Our ObjectWidget doesn't support nested objects
                  // detail: {
                  //   type: "object",
                  //   properties: {},
                  //   additionalProperties: true,
                  //   description: "Additional details/data to resolve with the action",
                  // },
                  variant: {
                    type: "string",
                    enum: [
                      "primary",
                      "secondary",
                      "success",
                      "danger",
                      "warning",
                      "info",
                      "light",
                      "dark",
                      "link",
                    ],
                    description: "The button variant/style",
                    default: "light",
                  },
                },
                required: ["type"],
              },
            },
          },
        },
        highlight: {
          type: "object",
          properties: {
            backgroundColor: {
              type: "string",
              description:
                "Color to highlight the element with when the step is active",
              examples: ["yellow", "red", "green"],
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
              description: "The scroll transition animation",
            },
          },
        },
        popover: {
          type: "object",
          properties: {
            placement: {
              type: "string",
              enum: [
                "auto",
                "auto-start",
                "auto-end",
                "top",
                "top-start",
                "top-end",
                "bottom",
                "bottom-start",
                "bottom-end",
                "right",
                "right-start",
                "right-end",
                "left",
                "left-start",
                "left-end",
              ],
              description: "Placement of the popover relative to the target",
              default: "auto",
            },
          },
        },
      },
    },
  },
  ["title", "body"],
);

function markdownPipeline(markdown: string): PipelineExpression {
  return toExpression("pipeline", [
    { id: validateRegistryId("@pixiebrix/markdown"), config: { markdown } },
  ]);
}

class TourStepTransformer extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/tour/step");

  constructor() {
    super(
      TourStepTransformer.BRICK_ID,
      "Show Tour Step",
      "Show a step in a tour",
    );
  }

  override defaultOutputKey = "step";

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  override async isPure(): Promise<boolean> {
    return false;
  }

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return [...CONTENT_SCRIPT_CAPABILITIES, "panel"];
  }

  async displayStep(
    element: HTMLElement | Document,
    { appearance = {}, title, body, isLastStep }: StepInputs,
    {
      abortSignal,
      logger: {
        context: { modComponentId: extensionId, modId: blueprintId },
      },
      platform,
      runRendererPipeline,
    }: BrickOptions,
  ): Promise<unknown> {
    // Currently only contentScript context is supported. This method needs to be re-worked to not call
    // the panel controller directly via the UNSAFE_panelController reference.
    expectContext("contentScript");

    let counter = 0;

    const location = element === document ? "modal" : "popover";

    let removeOverlay: () => void = noop;

    if (element !== document && appearance?.showOverlay) {
      // Our modal already adds a backdrop
      removeOverlay = addOverlay(element as HTMLElement);
    }

    const actions: PanelButton[] = appearance?.controls?.actions ?? [
      {
        caption: isLastStep ? "Done" : "Next",
        type: "submit",
        variant: "light",
      },
    ];

    assertNotNullish(extensionId, "Extension ID is required");

    const panelEntryMetadata: TemporaryPanelEntryMetadata = {
      extensionId,
      blueprintId,
      heading: title,
      actions,
      showCloseButton: appearance?.controls?.closeButton !== "none",
    };

    const getPayload = async () => {
      const result = await runRendererPipeline(
        body as PipelineExpression,
        {
          key: "body",
          counter,
        },
        {},
        element,
      );

      counter++;

      return result;
    };

    // Outside click handler
    let onOutsideClick: TemporaryPanelDefinition["onOutsideClick"] = noop;
    if (appearance.controls?.outsideClick === "cancel") {
      onOutsideClick = async (nonce) => {
        await UNSAFE_panelController.cancelTemporaryPanels(
          [nonce],
          new AbortPanelAction(),
        );
      };
    } else if (appearance.controls?.outsideClick === "submit") {
      onOutsideClick = async (nonce) => {
        await UNSAFE_panelController.cancelTemporaryPanels([nonce]);
      };
    }

    // Close button handler
    let onCloseClick: TemporaryPanelDefinition["onCloseClick"] = null;
    if (appearance.controls?.closeButton === "cancel") {
      onCloseClick = () => {
        throw new AbortPanelAction("User closed the panel");
      };
    } else if (appearance.controls?.closeButton === "submit") {
      // Allow the panel to close normally
      onCloseClick = noop;
    }

    try {
      return await platform.panels.showTemporary({
        panelEntryMetadata,
        getPayload,
        target: element,
        location,
        signal: abortSignal,
        refreshTrigger: appearance.refreshTrigger,
        onOutsideClick,
        onCloseClick,
        popoverOptions: appearance.popover,
      });
    } finally {
      removeOverlay();
    }
  }

  /**
   * The original style of the target element before it was highlighted as part of the tour step.
   */
  originalStyle: Record<string, string> = {};

  /**
   * Wait for the target element to appear on the page according to the `wait` configuration.
   */
  async locateElement(
    args: StepInputs,
    options: BrickOptions,
  ): Promise<HTMLElement> {
    let $elements: JQuery<Document | HTMLElement> = $safeFind(
      args.selector,
      options.root,
    );

    if ($elements.length === 0 && args.appearance?.wait) {
      try {
        $elements = await awaitElement({
          selector: args.selector,
          $root: $(options.root ?? document),
          maxWaitMillis: args.appearance.wait.maxWaitMillis,
          abortSignal: options.abortSignal,
        });
      } catch {
        // NOP
      }
    }

    if ($elements.length > 1) {
      throw new MultipleElementsFoundError(args.selector);
    }

    return $elements.get(0) as HTMLElement;
  }

  highlightTarget(
    element: HTMLElement,
    config: SetRequired<StepInputs, "appearance">["appearance"]["highlight"],
  ): void {
    if (isEmpty(config)) {
      return;
    }

    this.originalStyle = {
      backgroundColor: element.style.backgroundColor,
    };

    if (config.backgroundColor) {
      element.style.backgroundColor = config.backgroundColor;
    }
  }

  unhighlightTarget(element: HTMLElement): void {
    if (this.originalStyle.backgroundColor != null) {
      element.style.backgroundColor = this.originalStyle.backgroundColor;
    }
  }

  inputSchema: Schema = StepSchema;

  async transform(
    args: BrickArgs<StepInputs>,
    options: BrickOptions,
  ): Promise<unknown> {
    const {
      root,
      logger: { context },
    } = options;

    const {
      title,
      body,
      selector,
      onAfterShow,
      onBeforeShow,
      appearance = {},
    } = args;

    const nonce = getCurrentTour()?.nonce;

    if (!nonce) {
      throw new BusinessError("This brick can only be called from a tour");
    }

    const target = selector ? await this.locateElement(args, options) : root;

    if (target == null) {
      if (appearance.skippable) {
        // Skip because not found
        return {};
      }

      throw new NoElementsFoundError(
        selector,
        "Target element not available on the page",
      );
    }

    if (target !== document) {
      const targetElement = target as HTMLElement;
      this.highlightTarget(targetElement, appearance.highlight);

      if (appearance.scroll) {
        targetElement.scrollIntoView({
          behavior: appearance.scroll?.behavior,
          block: "nearest",
          inline: "nearest",
        });
      }
    }

    let result;

    try {
      if (onBeforeShow?.__value__) {
        await options.runPipeline(
          onBeforeShow,
          {
            key: "onBeforeShow",
            counter: 0,
          },
          {},
          target,
        );
      }

      // XXX: use title here? Or use the label from the block? Probably best to use title, since that's what
      // the user sees. The benefit of using block label is that for advanced use cases, the creator could duplicate
      // step names in order to group steps. That's probably better served by an explicit step key though.
      markTourStep(nonce, { step: title, context });

      // If passing markdown, wrap in Markdown brick
      const modifiedArgs: BrickArgs<StepInputs> =
        typeof body === "string"
          ? { ...args, body: markdownPipeline(body) }
          : args;

      result = await this.displayStep(target, modifiedArgs, options);

      if (onAfterShow?.__value__) {
        await options.runPipeline(
          onAfterShow,
          {
            key: "onAfterShow",
            counter: 0,
          },
          {},
          target,
        );
      }
    } finally {
      if (target !== document) {
        const targetElement = target as HTMLElement;
        this.unhighlightTarget(targetElement);
      }
    }

    return result ?? {};
  }
}

export default TourStepTransformer;
