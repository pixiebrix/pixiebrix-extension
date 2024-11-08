import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { uuidv4 } from "../../types/helpers";
import { waitForEffect } from "../../testUtils/testHelpers";
import { rectFactory } from "../../testUtils/factories/domFactories";
import type * as controllerModule from "./selectionMenuController";

document.body.innerHTML =
  '<div><span data-testid="span">Here\'s some text</span></div>';

// `jsdom` does not implement full layout engine
// https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform
(Range.prototype.getBoundingClientRect as any) = jest.fn(() => rectFactory());
(Range.prototype.getClientRects as any) = jest.fn(() => [rectFactory()]);

describe("selectionMenuController", () => {
  let module: typeof controllerModule;

  async function selectText() {
    const user = userEvent.setup();
    await user.tripleClick(screen.getByTestId("span"));
    document.dispatchEvent(new Event("selectionchange"));
    await waitForEffect();
  }

  // TODO: figure out how to properly isolate tests - adding multiple tests cause flakiness
  beforeEach(async () => {
    jest.resetModules();
    module = await import(
      "./selectionMenuController"
    );
  });

  // TODO: re-enable flaky test https://github.com/pixiebrix/pixiebrix-extension/issues/7682
  it.skip("attach selection menu when user selects text", async () => {
    module.initSelectionMenu();

    module.selectionMenuActionRegistry.register(uuidv4(), {
      title: "Copy",
      icon: undefined,
      handler() {},
    });

    await selectText();

    // I couldn't get screen from shadow-dom-testing-library to work, otherwise I would have use getByRole for 'menu'
    // I think it might only work with render().
    await expect(
      screen.findByTestId("pixiebrix-selection-menu"),
    ).resolves.toBeInTheDocument();
  });
});
