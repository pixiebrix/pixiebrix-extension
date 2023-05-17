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

import { defaultEventKey, eventKeyForEntry } from "@/sidebar/utils";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type FormEntry, type TemporaryPanelEntry } from "@/types/sidebarTypes";

import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import { HOME_PANEL } from "@/sidebar/HomePanel";

describe("defaultEventKey", () => {
  it("returns null no content", () => {
    expect(
      defaultEventKey({
        forms: [],
        panels: [],
        temporaryPanels: [],
        staticPanels: [],
        recipeToActivate: null,
      })
    ).toBe(null);
  });

  it("prefers latest form", () => {
    const args = {
      forms: [{ nonce: uuidv4() }, { nonce: uuidv4() }] as FormEntry[],
      temporaryPanels: [{ nonce: uuidv4() }] as TemporaryPanelEntry[],
      panels: [{ extensionId: uuidv4() }],
    } as any;

    expect(defaultEventKey(args)).toBe(eventKeyForEntry(args.forms[1]));
    expect(defaultEventKey(args)).not.toBe("form-undefined");
  });

  it("prefers latest temporary panel", () => {
    const args = {
      forms: [] as FormEntry[],
      temporaryPanels: [
        { nonce: uuidv4() },
        { nonce: uuidv4() },
      ] as TemporaryPanelEntry[],
      panels: [{ extensionId: uuidv4() }],
    } as any;

    expect(defaultEventKey(args)).toBe(
      eventKeyForEntry(args.temporaryPanels[1])
    );
    expect(defaultEventKey(args)).not.toBe("temporaryPanel-undefined");
  });

  it("prefers first panel", () => {
    const args = {
      forms: [] as FormEntry[],
      temporaryPanels: [] as TemporaryPanelEntry[],
      panels: [{ extensionId: uuidv4() }, { extensionId: uuidv4() }],
    } as any;

    expect(defaultEventKey(args)).toBe(eventKeyForEntry(args.panels[0]));
    expect(defaultEventKey(args)).not.toBe("panel-undefined");
  });

  it("returns static panel as last resort before returning null", () => {
    const args = {
      forms: [] as FormEntry[],
      temporaryPanels: [] as TemporaryPanelEntry[],
      panels: [] as TemporaryPanelEntry[],
      staticPanels: [HOME_PANEL],
    } as any;

    expect(defaultEventKey(args)).toBe(eventKeyForEntry(HOME_PANEL));
    expect(defaultEventKey(args)).not.toBe("panel-undefined");
  });
});

describe("eventKeyForEntry", () => {
  it.each([[undefined, null]])("returns null for %s", (value) => {
    expect(eventKeyForEntry(value)).toBe(null);
  });

  it("uses recipeId for activateRecipe", () => {
    const recipeId = validateRegistryId("@test/test-recipe");
    const entry = sidebarEntryFactory("activateRecipe", { recipeId });
    expect(eventKeyForEntry(entry)).toBe(`activate-${recipeId}`);
  });

  it("uses extensionId for panel", () => {
    const extensionId = uuidv4();
    const extensionPointId = validateRegistryId("@test/test-extension-point");
    const entry = sidebarEntryFactory("panel", {
      extensionId,
      extensionPointId,
    });
    expect(eventKeyForEntry(entry)).toBe(`panel-${extensionId}`);
  });

  it("uses nonce for forms and temporary panels", () => {
    const extensionId = uuidv4();
    const nonce = uuidv4();

    const formEntry = sidebarEntryFactory("form", { extensionId, nonce });
    expect(eventKeyForEntry(formEntry)).toBe(`form-${nonce}`);

    const temporaryPanelEntry = sidebarEntryFactory("temporaryPanel", {
      extensionId,
      nonce,
    });
    expect(eventKeyForEntry(temporaryPanelEntry)).toBe(
      `temporaryPanel-${nonce}`
    );
  });

  it("uses key for static panels", () => {
    const key = "test";
    const entry = sidebarEntryFactory("staticPanel", { key });
    expect(eventKeyForEntry(entry)).toBe(`static-${key}-panel`);
  });
});
