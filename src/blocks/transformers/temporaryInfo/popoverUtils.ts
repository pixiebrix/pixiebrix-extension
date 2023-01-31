import { createPopper } from "@popperjs/core";
import { iframeResizer } from "iframe-resizer";
import { once, trimEnd } from "lodash";
import popoverStyleUrl from "./popover.scss?loadAsUrl";
import injectStylesheet from "@/utils/injectStylesheet";
import { uuidv4, validateUUID } from "@/types/helpers";
import { setTemporaryOverlayPanel } from "@/contentScript/ephemeralPanelController";
import { getThisFrame } from "webext-messenger";
import { setAnimationFrameInterval } from "@/utils";

/**
 * Attaches a tooltip container to the DOM.
 *
 * Having a separate container instead of attaching to the body directly improves performance, see:
 * https://popper.js.org/docs/v2/performance/#attaching-elements-to-the-dom
 */
function ensureTooltipsContainer(): Element {
  let container = document.querySelector("#pb-tooltips-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "pb-tooltips-container";
    document.body.append(container);
  }

  return container;
}

// https://popper.js.org/docs/v2/constructors/
export type Placement =
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

type PopoverOptions = {
  placement?: Placement;
};

/**
 * Pool of available popovers that can be re-used to avoid frame cold-start.
 */
const popoverPool: HTMLElement[] = [];

/**
 * Creates a new frame, or reuses an existing one.
 * @param initialUrl the original frame URL
 */
function popoverFactory(initialUrl: URL): HTMLElement {
  const $container = $(ensureTooltipsContainer());

  if (popoverPool.length === 0) {
    const decoratedUrl = new URL(initialUrl);
    const frameNonce = uuidv4();
    console.debug("No available popovers, creating popover %s", frameNonce);

    // Pass to the EphemeralPanel for useTemporaryPanelDefinition
    decoratedUrl.searchParams.set("frameNonce", frameNonce);

    const $tooltip = $(
      `<div role="tooltip" data-popover-id="${frameNonce}" style="display: none;"><iframe src="${decoratedUrl.href}" title="Popover content" scrolling="no" style="border: 0; color-scheme: normal;"></iframe><div data-popper-arrow></div></div>`
    );

    $container.append($tooltip);

    popoverPool.push($tooltip.get()[0]);
  } else {
    console.debug("Using existing frame from frame pool");
  }

  return popoverPool.pop();
}

/**
 * Allocate a popover not tied to any panel nonce.
 */
async function preAllocatePopover(): Promise<void> {
  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("ephemeralPanel.html"));
  frameSource.searchParams.set("opener", JSON.stringify(target));
  frameSource.searchParams.set("mode", "popover");

  popoverFactory(frameSource);
}

/**
 * Initialize the popover pool.
 */
export const initPopoverPool = once(async () => {
  void injectStylesheet(popoverStyleUrl);
  await preAllocatePopover();
});

/**
 * Reclaim a popover for the popover pool
 * @param popover the popover element.
 */
function reclaimPopover(popover: HTMLElement): void {
  const $popover = $(popover);

  // Hide, but keep in DOM tree so iframe doesn't have to reload
  $popover.hide();

  // Clear content from the panel
  setTemporaryOverlayPanel({
    frameNonce: validateUUID(popover.dataset.popoverId),
    panelNonce: null,
  });

  // Mark as available in the popover pool
  popoverPool.push(popover);
}

function attachPopover({
  url,
  element,
  placement,
}: {
  url: URL;
  nonce: string;
  element: HTMLElement;
  placement?: Placement;
}) {
  const tooltip = popoverFactory(url);
  const $tooltip = $(tooltip);

  $tooltip.show();

  const popper = createPopper(element, tooltip, {
    placement: placement ?? "auto",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [16, 16],
        },
      },
      {
        name: "arrow",
      },
    ],
  });

  return {
    popper,
    tooltip,
    frameNonce: validateUUID(tooltip.dataset.popoverId),
  };
}

export function showPopover(
  url: URL,
  element: HTMLElement,
  onHide: () => void,
  abortController: AbortController,
  { placement }: PopoverOptions = {}
): {
  /**
   * Callback to be called when the popover content ready to be shown.
   */
  onReady: () => void;
} {
  void injectStylesheet(popoverStyleUrl);
  const $body = $(document.body);
  const nonce = validateUUID(url.searchParams.get("nonce"));

  const { tooltip, frameNonce } = attachPopover({
    url,
    nonce,
    element,
    placement,
  });

  const [resizer] = iframeResizer(
    {
      id: nonce,
      // NOTE: autoResize doesn't work very well because BodyContainer has a Shadow DOM. So the mutation
      // observer used by iframeResizer can't see it
      autoResize: false,
      sizeWidth: true,
      sizeHeight: true,
      checkOrigin: [trimEnd(chrome.runtime.getURL(""), "/")],
      // Looks for data-iframe-height in PopoverLayout
      heightCalculationMethod: "taggedElement",
    },
    tooltip.querySelector("iframe")
  );

  // NOTE: autoResize doesn't work very well because BodyContainer has a Shadow DOM. So the mutation
  // observer built into iframeResizer can't see it
  void setAnimationFrameInterval(
    () => {
      resizer.iFrameResizer.resize();
    },
    { signal: abortController.signal }
  );

  const outsideClickListener = (event: JQuery.TriggeredEvent) => {
    if ($(event.target).closest(tooltip).length === 0) {
      onHide();
    }
  };

  // Hide tooltip on click outside
  $body.on("click touchend", outsideClickListener);

  abortController.signal.addEventListener("abort", () => {
    // Must be done before removing the tooltip, otherwise the iframe will be removed from the DOM
    reclaimPopover(tooltip);

    // Don't destroy popper: it also removes the iframe from the DOM
    // popper.destroy();

    $body.off("click touchend", outsideClickListener);
  });

  return {
    onReady() {
      setTemporaryOverlayPanel({ frameNonce, panelNonce: nonce });
    },
  };
}
