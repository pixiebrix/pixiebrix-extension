import { createPopper } from "@popperjs/core";

// https://popper.js.org/docs/v2/performance/#attaching-elements-to-the-dom
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
    `<div role="tooltip"><iframe src="${url.href}" title="Popover content" style="border: 0; flex-grow: 1; color-scheme: normal;" /></div>`
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

  const updateListener = (event: Event) => {
    if (event instanceof CustomEvent && event.detail.nonce === nonce) {
      // Force popper resize
      void popper.update();
    }
  };

  document.addEventListener("@@pixiebrix/PANEL_MOUNTED", updateListener);

  const outsideClickListener = (event: JQuery.TriggeredEvent) => {
    if ($(event.target).closest(tooltip).length === 0) {
      onHide();
    }
  };

  // Hide tooltip on click outside
  $body.on("click touchend", outsideClickListener);

  abortController.signal.addEventListener("abort", () => {
    tooltip.remove();
    popper.destroy();
    document.removeEventListener("panelMounted", updateListener);
    $body.off("click touchend", outsideClickListener);
  });
}
