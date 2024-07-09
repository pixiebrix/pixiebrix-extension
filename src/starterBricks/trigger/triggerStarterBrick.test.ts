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

import { validateRegistryId } from "@/types/helpers";
import { define, derive } from "cooky-cutter";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { type Metadata, DefinitionKinds } from "@/types/registryTypes";
import { type BrickPipeline } from "@/bricks/types";
import {
  getDocument,
  InvalidContextReader,
  RootReader,
  tick,
} from "@/starterBricks/starterBrickTestUtils";
import blockRegistry from "@/bricks/registry";
import {
  fromJS,
  getDefaultAllowInactiveFramesForTrigger,
  type TriggerConfig,
  type TriggerDefinition,
} from "@/starterBricks/trigger/triggerStarterBrick";
import { getReferenceForElement } from "@/contentScript/elementReference";
import userEvent from "@testing-library/user-event";
import { waitForEffect } from "@/testUtils/testHelpers";
import { ensureMocksReset, requestIdleCallback } from "@shopify/jest-dom-mocks";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { RunReason } from "@/types/runtimeTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import {
  throwBrick,
  ThrowBrick,
  ThrowTwiceBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { showNotification } from "@/utils/notify";
import { notifyContextInvalidated } from "@/errors/contextInvalidated";
import reportError from "@/telemetry/reportError";
import reportEvent from "@/telemetry/reportEvent";
import { screen } from "@testing-library/react";
import type { Trigger } from "@/starterBricks/trigger/triggerStarterBrickTypes";
import { getPlatform } from "@/platform/platformContext";

let hidden = false;

// https://github.com/jsdom/jsdom/issues/2391#issuecomment-429085358
Object.defineProperty(document, "hidden", {
  configurable: true,
  get() {
    return hidden;
  },
});

jest.mock("@/errors/contextInvalidated", () => {
  const actual = jest.requireActual("@/errors/contextInvalidated");
  return {
    ...actual,
    notifyContextInvalidated: jest.fn(),
  };
});

jest.mock("@/utils/notify");

const reportErrorMock = jest.mocked(reportError);
const reportEventMock = jest.mocked(reportEvent);
const showNotificationMock = jest.mocked(showNotification);
const notifyContextInvalidatedMock = jest.mocked(notifyContextInvalidated);

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickDefinitionLike<TriggerDefinition>>({
    apiVersion: "v3",
    kind: DefinitionKinds.STARTER_BRICK,
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      }) as Metadata,
    definition: define<TriggerDefinition>({
      type: "trigger",
      background: derive<TriggerDefinition, boolean>((x) =>
        getDefaultAllowInactiveFramesForTrigger(x.trigger!),
      ),
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [RootReader.BRICK_ID],
      ...definitionOverrides,
    }),
  });

const modComponentFactory = define<HydratedModComponent<TriggerConfig>>({
  apiVersion: "v3",
  _hydratedModComponentBrand: undefined as never,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: undefined,
  label: "Test Extension",
  config: define<TriggerConfig>({
    action: () => [] as BrickPipeline,
  }),
});

const rootReader = new RootReader();

beforeAll(() => {
  requestIdleCallback.mock();
});

beforeEach(() => {
  ensureMocksReset();
  hidden = false;
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  reportErrorMock.mockReset();
  reportEventMock.mockReset();
  showNotificationMock.mockReset();
  notifyContextInvalidatedMock.mockReset();
  blockRegistry.clear();
  blockRegistry.register([
    rootReader,
    new InvalidContextReader(),
    throwBrick,
    new ThrowTwiceBrick(),
  ]);
  rootReader.readCount = 0;
  rootReader.ref = null;
});

describe("triggerStarterBrick", () => {
  it.each([["load"], [undefined]])(
    "runs page load trigger",
    async (trigger) => {
      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          trigger,
        })(),
      );

      starterBrick.registerModComponent(
        modComponentFactory({
          extensionPointId: starterBrick.id,
        }),
      );

      await starterBrick.install();
      await starterBrick.runModComponents({ reason: RunReason.MANUAL });

      expect(rootReader.readCount).toBe(1);

      starterBrick.uninstall();
    },
  );

  it("runs non-background page load trigger on visibilitychange", async () => {
    hidden = true;

    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        background: false,
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    const runPromise = starterBrick.runModComponents({
      reason: RunReason.MANUAL,
    });

    expect(rootReader.readCount).toBe(0);

    // Runs when the document becomes visible
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));

    await runPromise;

    expect(rootReader.readCount).toBe(1);

    starterBrick.uninstall();
  });

  it("runs non-background page load runs immediately if page visible", async () => {
    hidden = false;

    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        background: false,
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({
      reason: RunReason.MANUAL,
    });

    expect(rootReader.readCount).toBe(1);

    starterBrick.uninstall();
  });

  it.each([[undefined], ["once"], ["watch"]])(
    "attachMode: %s",
    async (attachMode) => {
      document.body.innerHTML = getDocument(
        "<button>Click Me</button>",
      ).body.innerHTML;

      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          trigger: "click",
          attachMode,
          rootSelector: "button",
        })(),
      );

      starterBrick.registerModComponent(
        modComponentFactory({
          extensionPointId: starterBrick.id,
        }),
      );

      await starterBrick.install();
      await starterBrick.runModComponents({ reason: RunReason.MANUAL });

      expect(rootReader.readCount).toBe(0);

      screen.getByRole("button").click();
      await tick();
      expect(rootReader.readCount).toBe(1);

      document.body.innerHTML = "";
      document.body.innerHTML = getDocument(
        "<button>Click Me</button>",
      ).body.innerHTML;

      requestIdleCallback.runIdleCallbacks();

      // Give the mutation observer time to run
      await tick();
      await tick();

      // Check click handler was not re-attached
      screen.getByRole("button").click();
      await tick();

      expect(rootReader.readCount).toBe(attachMode === "watch" ? 2 : 1);

      starterBrick.uninstall();
    },
  );

  it.each([[undefined], ["eventTarget"]])(
    "targetMode: %s",
    async (targetMode) => {
      document.body.innerHTML = getDocument(
        "<div><button>Click Me</button></div>",
      ).body.innerHTML;

      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          trigger: "click",
          targetMode,
          rootSelector: "div",
        })(),
      );

      starterBrick.registerModComponent(
        modComponentFactory({
          extensionPointId: starterBrick.id,
        }),
      );

      await starterBrick.install();
      await starterBrick.runModComponents({ reason: RunReason.MANUAL });

      screen.getByRole("button").click();
      await tick();

      const buttonRef = getReferenceForElement(screen.getByRole("button"));

      expect(rootReader.readCount).toBe(1);
      expect(rootReader.ref).toBe(buttonRef);

      starterBrick.uninstall();
    },
  );

  it("targetMode: root", async () => {
    document.body.innerHTML = getDocument(
      "<div data-testid=ref><button>Click Me</button></div>",
    ).body.innerHTML;

    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "click",
        targetMode: "root",
        rootSelector: "div",
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    screen.getByRole("button").click();
    await tick();

    const divRef = getReferenceForElement(screen.getByTestId("ref"));

    expect(rootReader.readCount).toBe(1);
    expect(rootReader.ref).toBe(divRef);

    starterBrick.uninstall();
  });

  it("runs keypress trigger", async () => {
    document.body.innerHTML = getDocument(
      "<div><input type='text'></input></div>",
    ).body.innerHTML;

    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "keypress",
        rootSelector: "input",
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    const element = screen.getByRole("textbox");

    await userEvent.type(element, "a");
    await waitForEffect();

    expect(rootReader.readCount).toBe(1);

    starterBrick.uninstall();
  });

  it("runs hover trigger", async () => {
    document.body.innerHTML = getDocument(
      "<div><button>Hover Me</button></div>",
    ).body.innerHTML;

    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "hover",
        rootSelector: "button",
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    const buttonElement = screen.getByRole("button");

    // This causes the hoverintent.js:handleHover handle to fire. But the vendored logic doesn't recognize it as a
    // hover for purposes of triggering the event
    await userEvent.hover(buttonElement);
    await waitForEffect();

    // See comment above, the handler isn't actually run because userEvent.hover isn't enough to trigger hoverintent
    expect(rootReader.readCount).toBe(0);

    starterBrick.uninstall();
  });

  it("includes selection change reader schema", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "selectionchange",
      })(),
    );

    const reader = await starterBrick.defaultReader();

    expect(
      (reader.outputSchema.properties as any).event.properties.selectionText
        .type,
    ).toBe("string");
  });

  it("includes custom event schema", async () => {
    const extensionPoint = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "custom",
      })(),
    );

    const reader = await extensionPoint.defaultReader();
    expect(
      (reader.outputSchema.properties as any).event.additionalProperties,
    ).toBe(true);
  });

  it("includes keyboard event schema", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "keypress",
      })(),
    );

    const reader = await starterBrick.defaultReader();
    expect(
      (reader.outputSchema.properties as any).event.properties.key.type,
    ).toBe("string");
  });

  it("excludes event for mouse click", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "click",
      })(),
    );

    const reader = await starterBrick.defaultReader();
    expect((reader.outputSchema.properties as any).event).toBeUndefined();
  });

  it.each([["selectionchange"], ["click"], ["keypress"], ["custom"]])(
    "smoke test for preview %s",
    async (trigger) => {
      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          trigger,
        })(),
      );

      const reader = await starterBrick.previewReader();
      const result = await reader.read(document);

      expect(result).toStrictEqual(
        expect.objectContaining({
          readCount: 1,
        }),
      );
    },
  );

  it("ignores context invalidated error for non user-action trigger in reader", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        reader: () => [InvalidContextReader.BRICK_ID],
      })({}),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(showNotificationMock).not.toHaveBeenCalled();
  });

  it("shows context invalidated for user action if showErrors: true", async () => {
    document.body.innerHTML = getDocument(
      "<div><button>Click Me</button></div>",
    ).body.innerHTML;

    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "click",
        rootSelector: "button",
        showErrors: true,
        reader: () => [InvalidContextReader.BRICK_ID],
      })({}),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    screen.getByRole("button").click();
    await tick();

    screen.getByRole("button").click();
    await tick();

    // Should not be called directly
    expect(showNotificationMock).not.toHaveBeenCalled();

    // It's a user action, so it should show on each user action
    expect(notifyContextInvalidatedMock).toHaveBeenCalledTimes(2);
  });

  it("reports only the first brick error or event for reportMode: once", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        reportMode: "once",
        showErrors: true,
      })({}),
    );

    const modComponent = modComponentFactory({
      extensionPointId: starterBrick.id,
      config: {
        action: { id: ThrowTwiceBrick.BRICK_ID, config: {} },
      },
    });

    starterBrick.registerModComponent(modComponent);

    await starterBrick.install();

    // Run 4x
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will throw an error
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will throw another error
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will run successfully
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will also run successfully

    // Does not report successful event only once
    expect(reportEventMock).toHaveBeenCalledExactlyOnceWith("TriggerRun", {
      modComponentId: modComponent.id,
    });

    // Reports an error once
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(showNotificationMock).toHaveBeenCalledExactlyOnceWith({
      type: "error",
      message: "An error occurred running a trigger",
      reportError: false,
      error: expect.toBeObject(),
    });
  });

  it("reports only the first brick error for reportMode: error-once", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        reportMode: "error-once",
        showErrors: true,
      })({}),
    );

    const modComponent = modComponentFactory({
      extensionPointId: starterBrick.id,
      config: {
        action: { id: ThrowTwiceBrick.BRICK_ID, config: {} },
      },
    });

    starterBrick.registerModComponent(modComponent);

    // Run 4x
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will throw an error
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will throw another error
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will run successfully
    await starterBrick.runModComponents({ reason: RunReason.MANUAL }); // Will also run successfully

    // Reports a successful event only once
    expect(reportEventMock).not.toHaveBeenCalled();

    // Reports an error once
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(showNotificationMock).toHaveBeenCalledExactlyOnceWith({
      type: "error",
      message: "An error occurred running a trigger",
      reportError: false,
      error: expect.toBeObject(),
    });
  });

  it("never reports brick errors for reportMode: never", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        reportMode: "never",
        showErrors: true,
      })({}),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
        config: {
          action: { id: ThrowBrick.BRICK_ID, config: {} },
        },
      }),
    );

    await starterBrick.install();

    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(reportErrorMock).not.toHaveBeenCalled();
    expect(showNotificationMock).not.toHaveBeenCalled();
  });

  it("reports all brick errors for reportMode: all, showErrors: true", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        reportMode: "all",
        showErrors: true,
      })({}),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
        config: {
          action: { id: ThrowBrick.BRICK_ID, config: {} },
        },
      }),
    );

    await starterBrick.install();

    // Run 2x
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(reportErrorMock).toHaveBeenCalledTimes(2);
    expect(showNotificationMock).toHaveBeenCalledTimes(2);
  });

  it("does not display error notifications for reportMode: all, showErrors: default", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        reportMode: "all",
        // Testing the default of false, for backward compatability
        // showErrors: false,
      })({}),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
        config: {
          action: { id: ThrowBrick.BRICK_ID, config: {} },
        },
      }),
    );

    await starterBrick.install();

    // Run 2x
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(reportErrorMock).toHaveBeenCalledTimes(2);
    expect(showNotificationMock).toHaveBeenCalledTimes(0);
  });

  it("reports error notifications, but does not display them for reportMode: default, showErrors: default", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: "load",
        // Testing the default of error-once, for backward compatability
        // reportMode: "error-once",
        // Testing the default of false, for backward compatability
        // showErrors: false,
      })({}),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
        config: {
          action: { id: ThrowBrick.BRICK_ID, config: {} },
        },
      }),
    );

    await starterBrick.install();

    // Run 2x
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(showNotificationMock).not.toHaveBeenCalled();
  });
});

describe("defaults", () => {
  describe("getDefaultAllowInactiveFramesForTrigger", () => {
    it("return false for interval", () => {
      expect(getDefaultAllowInactiveFramesForTrigger("interval")).toBe(false);
    });

    it.each(["load", "click"])(
      "returns true for trigger: %s",
      (trigger: Trigger) => {
        expect(getDefaultAllowInactiveFramesForTrigger(trigger)).toBe(true);
      },
    );
  });
});
