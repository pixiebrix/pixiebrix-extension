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
import { DefinitionKinds } from "@/types/registryTypes";
import { type BrickPipeline } from "@/bricks/types";
import {
  getDocument,
  InvalidContextReader,
  RootReader,
  tick,
} from "@/starterBricks/starterBrickTestUtils";
import brickRegistry from "@/bricks/registry";
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
import { screen, waitFor } from "@testing-library/react";
import {
  ReportModes,
  type Trigger,
  Triggers,
} from "@/starterBricks/trigger/triggerStarterBrickTypes";
import { getPlatform } from "@/platform/platformContext";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { mockIntersectionObserver } from "jsdom-testing-mocks";

const intersectionObserverMock = mockIntersectionObserver();

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
    metadata: metadataFactory,
    definition: define<TriggerDefinition>({
      type: StarterBrickTypes.TRIGGER,
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
  modMetadata: modMetadataFactory,
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
  brickRegistry.clear();
  brickRegistry.register([
    rootReader,
    new InvalidContextReader(),
    throwBrick,
    new ThrowTwiceBrick(),
  ]);
  rootReader.readCount = 0;
  rootReader.ref = null;
});

describe("triggerStarterBrick", () => {
  it.each([[Triggers.LOAD], [undefined]])(
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
        trigger: Triggers.LOAD,
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
        trigger: Triggers.LOAD,
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
          trigger: Triggers.CLICK,
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
          trigger: Triggers.CLICK,
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
        trigger: Triggers.CLICK,
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
      "<div><input type='text' /></div>",
    ).body.innerHTML;

    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: Triggers.KEYPRESS,
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
        trigger: Triggers.HOVER,
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
        trigger: Triggers.SELECTION_CHANGE,
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
        trigger: Triggers.CUSTOM,
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
        trigger: Triggers.KEYPRESS,
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
        trigger: Triggers.CLICK,
      })(),
    );

    const reader = await starterBrick.defaultReader();
    expect((reader.outputSchema.properties as any).event).toBeUndefined();
  });

  it.each([
    ["selectionchange"],
    [Triggers.CLICK],
    [Triggers.KEYPRESS],
    [Triggers.CUSTOM],
  ])("smoke test for preview %s", async (trigger) => {
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
  });

  it("ignores context invalidated error for non user-action trigger in reader", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: Triggers.LOAD,
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
        trigger: Triggers.CLICK,
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
        trigger: Triggers.LOAD,
        reportMode: ReportModes.ONCE,
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

    // Report successful event only once
    expect(reportEventMock).toHaveBeenCalledExactlyOnceWith("TriggerRun", {
      label: modComponent.label,
      modComponentId: modComponent.id,
      modId: modComponent.modMetadata.id,
      modVersion: modComponent.modMetadata.version,
      trigger: Triggers.LOAD,
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
        trigger: Triggers.LOAD,
        reportMode: ReportModes.ERROR_ONCE,
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
        trigger: Triggers.LOAD,
        reportMode: ReportModes.NEVER,
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
        trigger: Triggers.LOAD,
        reportMode: ReportModes.ALL,
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
        trigger: Triggers.LOAD,
        reportMode: ReportModes.ALL,
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
        trigger: Triggers.LOAD,
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
      expect(getDefaultAllowInactiveFramesForTrigger(Triggers.INTERVAL)).toBe(
        false,
      );
    });

    it.each([Triggers.LOAD, Triggers.CLICK])(
      "returns true for trigger: %s",
      (trigger: Trigger) => {
        expect(getDefaultAllowInactiveFramesForTrigger(trigger)).toBe(true);
      },
    );
  });
});

describe("page editor run reasons", () => {
  it("doesn't run LOAD trigger for PAGE_EDITOR_REGISTER", async () => {
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        trigger: Triggers.LOAD,
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({
      reason: RunReason.PAGE_EDITOR_REGISTER,
    });

    expect(rootReader.readCount).toBe(0);

    await starterBrick.runModComponents({ reason: RunReason.PAGE_EDITOR_RUN });
    expect(rootReader.readCount).toBe(1);

    starterBrick.uninstall();
  });

  it.each([Triggers.INITIALIZE, Triggers.APPEAR])(
    "doesn't run %s trigger for PAGE_EDITOR_REGISTER for attachMode: once",
    async (trigger) => {
      document.body.innerHTML = getDocument(
        "<div><input type='text' /></div>",
      ).body.innerHTML;

      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          trigger,
          rootSelector: "input",
          attachMode: "once",
        })(),
      );

      starterBrick.registerModComponent(
        modComponentFactory({
          extensionPointId: starterBrick.id,
        }),
      );

      await starterBrick.install();
      await starterBrick.runModComponents({
        reason: RunReason.PAGE_EDITOR_REGISTER,
      });

      intersectionObserverMock.enterNodes([
        // eslint-disable-next-line testing-library/no-node-access -- non-React test
        ...document.querySelectorAll("input"),
      ]);

      await tick();
      await tick();
      expect(rootReader.readCount).toBe(0);

      await starterBrick.runModComponents({
        reason: RunReason.PAGE_EDITOR_RUN,
      });

      intersectionObserverMock.enterNodes([
        // eslint-disable-next-line testing-library/no-node-access -- non-React test
        ...document.querySelectorAll("input"),
      ]);

      await waitFor(() => {
        expect(rootReader.readCount).toBe(1);
      });

      starterBrick.uninstall();
    },
  );

  it.each([Triggers.INITIALIZE, Triggers.APPEAR])(
    "doesn't run %s trigger existing element for PAGE_EDITOR_REGISTER for attachMode: watch",
    async (trigger) => {
      document.body.innerHTML = getDocument(
        "<div><input type='text' /></div>",
      ).body.innerHTML;

      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          trigger,
          rootSelector: "input",
          attachMode: "watch",
        })(),
      );

      starterBrick.registerModComponent(
        modComponentFactory({
          extensionPointId: starterBrick.id,
        }),
      );

      await starterBrick.install();
      await starterBrick.runModComponents({
        reason: RunReason.PAGE_EDITOR_REGISTER,
      });

      intersectionObserverMock.enterNodes([
        // eslint-disable-next-line testing-library/no-node-access -- non-React test
        ...document.querySelectorAll("input"),
      ]);

      // Ticks required for initialize callback to have a chance to run (it uses setTimeout).
      await tick();
      await tick();
      expect(rootReader.readCount).toBe(0);

      $(document.body).append("<input id='#new-element' type='text' />");

      // Ticks required for initialize callback to have a chance to run (it uses setTimeout)
      await tick();
      await tick();

      intersectionObserverMock.enterNodes([
        // eslint-disable-next-line testing-library/no-node-access -- non-React test
        ...document.querySelectorAll("input"),
      ]);

      await waitFor(() => {
        expect(rootReader.readCount).toBe(1);
      });

      starterBrick.uninstall();
    },
  );
});
