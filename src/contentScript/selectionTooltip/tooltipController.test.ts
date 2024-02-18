import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { uuidv4 } from "@/types/helpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import { rectFactory } from "@/testUtils/factories/domFactories";
import type * as controllerModule from "@/contentScript/selectionTooltip/tooltipController";

document.body.innerHTML =
  '<div><span data-testid="span">Here\'s some text</span></div>';

// `jsdom` does not implement full layout engine
// https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform
(Range.prototype.getBoundingClientRect as any) = jest.fn(() => rectFactory());
(Range.prototype.getClientRects as any) = jest.fn(() => [rectFactory()]);

describe("tooltipController", () => {
  let module: typeof controllerModule;

  async function selectText() {
    const user = userEvent.setup();
    await user.tripleClick(screen.getByTestId("span"));
    document.dispatchEvent(new Event("selectionchange"));
    await waitForEffect();
  }

  beforeEach(async () => {
    jest.resetModules();
    module = await import("@/contentScript/selectionTooltip/tooltipController");
  });

  it("don't show tooltip if no actions are registered", async () => {
    module.initSelectionTooltip();
    await selectText();
    expect(
      screen.queryByRole("pixiebrix-selection-tooltip"),
    ).not.toBeInTheDocument();
  });

  it("attach tooltip when user selects text", async () => {
    module.initSelectionTooltip();

    module.tooltipActionRegistry.register(uuidv4(), {
      title: "Copy",
      icon: undefined,
      handler() {},
    });

    await selectText();

    // I couldn't get screen from shadow-dom-testing-library to work, otherwise I would have use getByRole for 'menu'
    // I think it might only work with render().
    expect(
      screen.getByTestId("pixiebrix-selection-tooltip"),
    ).toBeInTheDocument();
  });
});
