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

import { validateRegistryId } from "@/types/helpers";
import { type UnknownObject } from "@/types/objectTypes";
import { define } from "cooky-cutter";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { type Metadata } from "@/types/registryTypes";
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
  type TriggerConfig,
  type TriggerDefinition,
} from "@/starterBricks/triggerExtension";
import { getReferenceForElement } from "@/contentScript/elementReference";
import userEvent from "@testing-library/user-event";
import { waitForEffect } from "@/testUtils/testHelpers";
import { ensureMocksReset, requestIdleCallback } from "@shopify/jest-dom-mocks";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { RunReason } from "@/types/runtimeTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import {
  throwBrick,
  ThrowBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import notify from "@/utils/notify";
import { notifyContextInvalidated } from "@/errors/contextInvalidated";
import reportError from "@/telemetry/reportError";
import { screen } from "@testing-library/react";

// Avoid errors being interpreted as context invalidated error
browser.runtime.id = "abcxyz";

jest.mock("@/errors/contextInvalidated", () => {
  const actual = jest.requireActual("@/errors/contextInvalidated");
  return {
    ...actual,
    notifyContextInvalidated: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock("@/utils/notify", () => ({
  __esModule: true,
  default: {
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

const reportErrorMock = jest.mocked(reportError);
const notifyErrorMock = jest.mocked(notify.error);
const notifyContextInvalidatedMock = jest.mocked(notifyContextInvalidated);

beforeAll(() => {
  requestIdleCallback.mock();
});

const extensionPointFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickConfig<TriggerDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      } as Metadata),
    definition: define<TriggerDefinition>({
      type: "trigger",
      background: false,
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [RootReader.BRICK_ID],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedModComponent<TriggerConfig>>({
  apiVersion: "v3",
  _resolvedModComponentBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<TriggerConfig>({
    action: () => [] as BrickPipeline,
  }),
});

const rootReader = new RootReader();

beforeEach(() => {
  ensureMocksReset();
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  reportErrorMock.mockReset();
  notifyErrorMock.mockReset();
  notifyContextInvalidatedMock.mockReset();
  blockRegistry.clear();
  blockRegistry.register([rootReader, new InvalidContextReader(), throwBrick]);
  rootReader.readCount = 0;
  rootReader.ref = undefined;
});

describe("triggerExtension", () => {
  it.each([["load"], [undefined]])(
    "runs page load trigger",
    async (trigger) => {
      const extensionPoint = fromJS(
        extensionPointFactory({
          trigger,
        })()
      );

      extensionPoint.registerModComponent(
        extensionFactory({
          extensionPointId: extensionPoint.id,
        })
      );

      await extensionPoint.install();
      await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

      expect(rootReader.readCount).toBe(1);

      extensionPoint.uninstall();
    }
  );

  it.each([[undefined], ["once"], ["watch"]])(
    "attachMode: %s",
    async (attachMode) => {
      document.body.innerHTML = getDocument(
        "<button>Click Me</button>"
      ).body.innerHTML;

      const extensionPoint = fromJS(
        extensionPointFactory({
          trigger: "click",
          attachMode,
          rootSelector: "button",
        })()
      );

      extensionPoint.registerModComponent(
        extensionFactory({
          extensionPointId: extensionPoint.id,
        })
      );

      await extensionPoint.install();
      await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

      expect(rootReader.readCount).toBe(0);

      screen.getByRole("button").click();
      await tick();
      expect(rootReader.readCount).toBe(1);

      document.body.innerHTML = "";
      document.body.innerHTML = getDocument(
        "<button>Click Me</button>"
      ).body.innerHTML;

      requestIdleCallback.runIdleCallbacks();

      // Give the mutation observer time to run
      await tick();
      await tick();

      // Check click handler was not re-attached
      screen.getByRole("button").click();
      await tick();

      expect(rootReader.readCount).toBe(attachMode === "watch" ? 2 : 1);

      extensionPoint.uninstall();
    }
  );

  it.each([[undefined], ["eventTarget"]])(
    "targetMode: %s",
    async (targetMode) => {
      document.body.innerHTML = getDocument(
        "<div><button>Click Me</button></div>"
      ).body.innerHTML;

      const extensionPoint = fromJS(
        extensionPointFactory({
          trigger: "click",
          targetMode,
          rootSelector: "div",
        })()
      );

      extensionPoint.registerModComponent(
        extensionFactory({
          extensionPointId: extensionPoint.id,
        })
      );

      await extensionPoint.install();
      await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

      screen.getByRole("button").click();
      await tick();

      const buttonRef = getReferenceForElement(screen.getByRole("button"));

      expect(rootReader.readCount).toBe(1);
      expect(rootReader.ref).toBe(buttonRef);

      extensionPoint.uninstall();
    }
  );

  it("targetMode: root", async () => {
    document.body.innerHTML = getDocument(
      "<div data-testid=ref><button>Click Me</button></div>"
    ).body.innerHTML;

    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "click",
        targetMode: "root",
        rootSelector: "div",
      })()
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    screen.getByRole("button").click();
    await tick();

    const divRef = getReferenceForElement(screen.getByTestId("ref"));

    expect(rootReader.readCount).toBe(1);
    expect(rootReader.ref).toBe(divRef);

    extensionPoint.uninstall();
  });

  it("runs keypress trigger", async () => {
    document.body.innerHTML = getDocument(
      "<div><input type='text'></input></div>"
    ).body.innerHTML;

    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "keypress",
        rootSelector: "input",
      })()
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    const element = screen.getByRole("textbox");

    await userEvent.type(element, "a");
    await waitForEffect();

    expect(rootReader.readCount).toBe(1);

    extensionPoint.uninstall();
  });

  it("runs hover trigger", async () => {
    document.body.innerHTML = getDocument(
      "<div><button>Hover Me</button></div>"
    ).body.innerHTML;

    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "hover",
        rootSelector: "button",
      })()
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    const buttonElement = screen.getByRole("button");

    // This causes the hoverintent.js:handleHover handle to fire. But the vendored logic doesn't recognize it as a
    // hover for purposes of triggering the event
    await userEvent.hover(buttonElement);
    await waitForEffect();

    // See comment above, the handler isn't actually run because userEvent.hover isn't enough to trigger hoverintent
    expect(rootReader.readCount).toBe(0);

    extensionPoint.uninstall();
  });

  it("includes selection change reader schema", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "selectionchange",
      })()
    );

    const reader = await extensionPoint.defaultReader();

    expect(
      (reader.outputSchema.properties as any).event.properties.selectionText
        .type
    ).toBe("string");
  });

  it("includes custom event schema", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "custom",
      })()
    );

    const reader = await extensionPoint.defaultReader();
    expect(
      (reader.outputSchema.properties as any).event.additionalProperties
    ).toBe(true);
  });

  it("includes keyboard event schema", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "keypress",
      })()
    );

    const reader = await extensionPoint.defaultReader();
    expect(
      (reader.outputSchema.properties as any).event.properties.key.type
    ).toBe("string");
  });

  it("excludes event for mouse click", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "click",
      })()
    );

    const reader = await extensionPoint.defaultReader();
    expect((reader.outputSchema.properties as any).event).toBeUndefined();
  });

  it.each([["selectionchange"], ["click"], ["keypress"], ["custom"]])(
    "smoke test for preview %s",
    async (trigger) => {
      const extensionPoint = fromJS(
        extensionPointFactory({
          trigger,
        })()
      );

      const reader = await extensionPoint.previewReader();
      const result = await reader.read(document);

      expect(result).toStrictEqual(
        expect.objectContaining({
          readCount: 1,
        })
      );
    }
  );

  it("ignores context invalidated error for non user-action trigger in reader", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "load",
        reader: () => [InvalidContextReader.BRICK_ID],
      })({})
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("shows context invalidated for user action if showErrors: true", async () => {
    document.body.innerHTML = getDocument(
      "<div><button>Click Me</button></div>"
    ).body.innerHTML;

    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "click",
        rootSelector: "button",
        showErrors: true,
        reader: () => [InvalidContextReader.BRICK_ID],
      })({})
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    screen.getByRole("button").click();
    await tick();

    screen.getByRole("button").click();
    await tick();

    // Should not be called directly
    expect(notifyErrorMock).not.toHaveBeenCalled();

    // It's a user action, so it should show on each user action
    expect(notifyContextInvalidatedMock).toHaveBeenCalledTimes(2);
  });

  it("reports only the first brick error for reportMode: once", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "load",
        reportMode: "once",
        showErrors: true,
      })({})
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
        config: {
          action: { id: ThrowBrick.BRICK_ID, config: {} },
        },
      })
    );

    await extensionPoint.install();

    // Run 2x
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    expect(reportErrorMock).toHaveBeenCalledTimes(1);

    expect(notifyErrorMock).toHaveBeenCalledExactlyOnceWith({
      message: "An error occurred running a trigger",
      reportError: false,
      error: expect.toBeObject(),
    });
  });

  it("reports all brick errors for reportMode: all, showErrors: true", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "load",
        reportMode: "all",
        showErrors: true,
      })({})
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
        config: {
          action: { id: ThrowBrick.BRICK_ID, config: {} },
        },
      })
    );

    await extensionPoint.install();

    // Run 2x
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    expect(reportErrorMock).toHaveBeenCalledTimes(2);
    expect(notifyErrorMock).toHaveBeenCalledTimes(2);
  });

  it("does not display error notifications for reportMode: all, showErrors: default", async () => {
    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "load",
        reportMode: "all",
        // Testing the default of false, for backward compatability
        // showErrors: false,
      })({})
    );

    extensionPoint.registerModComponent(
      extensionFactory({
        extensionPointId: extensionPoint.id,
        config: {
          action: { id: ThrowBrick.BRICK_ID, config: {} },
        },
      })
    );

    await extensionPoint.install();

    // Run 2x
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    expect(reportErrorMock).toHaveBeenCalledTimes(2);
    expect(notifyErrorMock).toHaveBeenCalledTimes(0);
  });
});
