import {
  initSelectionTooltip,
  tooltipActionRegistry,
} from "@/contentScript/selectionTooltip/tooltipController";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { uuidv4 } from "@/types/helpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import { rectFactory } from "@/testUtils/factories/domFactories";

document.body.innerHTML =
  '<div><span data-testid="span">Here\'s some text</span></div>';

// `jsdom` does not implement full layout engine
// https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform
(Range.prototype.getBoundingClientRect as any) = jest.fn(() => rectFactory());
(Range.prototype.getClientRects as any) = jest.fn(() => [rectFactory()]);

describe("tooltipController", () => {
  async function selectText() {
    const user = userEvent.setup();
    await user.tripleClick(screen.getByTestId("span"));
    document.dispatchEvent(new Event("selectionchange"));
    await waitForEffect();
  }

  it("don't show tooltip if no actions are registered", async () => {
    initSelectionTooltip();
    await selectText();
    expect(
      screen.queryByRole("pixiebrix-selection-tooltip"),
    ).not.toBeInTheDocument();
  });

  it("attach tooltip when user selects text", async () => {
    initSelectionTooltip();

    tooltipActionRegistry.register(uuidv4(), {
      title: "Copy",
      icon: undefined,
      handler() {},
    });

    await selectText();

    // I couldn't get screen from shadow dom testing library to work, otherwise I would have use getByRole for 'menu'
    expect(
      screen.getByTestId("pixiebrix-selection-tooltip"),
    ).toBeInTheDocument();
  });
});
