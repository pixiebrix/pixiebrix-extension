import { createPopper } from "@popperjs/core";
import { iframeResizer } from "iframe-resizer";
import { trimEnd } from "lodash";
import { PANEL_MOUNTED_EVENT_TYPE } from "@/blocks/transformers/temporaryInfo/constants";

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

export function showPopover(
  url: URL,
  element: HTMLElement,
  onHide: () => void,
  abortController: AbortController
): void {
  const nonce = url.searchParams.get("nonce");

  const $tooltip = $(
    `<div role="tooltip" data-popover-id="${nonce}"><iframe id="${nonce}" src="${url.href}" title="Popover content" scrolling="no" style="border: 0; color-scheme: normal;" /></div>`
  );
  const tooltip: HTMLElement = $tooltip.get()[0];

  ensureTooltipsContainer().append(tooltip);
  const $body = $(document.body);

  const popper = createPopper(element, tooltip, {
    placement: "auto",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [8, 8],
        },
      },
    ],
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
  // observer used by iframeResizer can't see it
  const interval = setInterval(() => {
    resizer.iFrameResizer.resize();
  }, 25);

  const mountListener = (event: Event) => {
    if (event instanceof CustomEvent && event.detail.nonce === nonce) {
      // Force popper position update
      void popper.update();
    }
  };

  document.addEventListener(PANEL_MOUNTED_EVENT_TYPE, mountListener);

  const outsideClickListener = (event: JQuery.TriggeredEvent) => {
    if ($(event.target).closest(tooltip).length === 0) {
      onHide();
    }
  };

  // Hide tooltip on click outside
  $body.on("click touchend", outsideClickListener);

  abortController.signal.addEventListener("abort", () => {
    clearInterval(interval);
    tooltip.remove();
    popper.destroy();
    document.removeEventListener("panelMounted", mountListener);
    $body.off("click touchend", outsideClickListener);
  });
}
