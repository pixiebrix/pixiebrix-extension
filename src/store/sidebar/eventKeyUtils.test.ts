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

import {
  defaultEventKey,
  eventKeyForEntry,
} from "@/store/sidebar/eventKeyUtils";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type SidebarEntries, type SidebarState } from "@/types/sidebarTypes";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import { MOD_LAUNCHER } from "@/store/sidebar/constants";

describe("defaultEventKey", () => {
  it("returns null no content", () => {
    expect(
      defaultEventKey(
        {
          forms: [],
          panels: [],
          temporaryPanels: [],
          staticPanels: [],
          modActivationPanel: null,
        },
        {},
      ),
    ).toBeNull();
  });

  it("prefers latest form", () => {
    const args = {
      forms: [sidebarEntryFactory("form"), sidebarEntryFactory("form")],
      temporaryPanels: [sidebarEntryFactory("temporaryPanel")],
      panels: [sidebarEntryFactory("panel")],
    } as SidebarEntries;

    expect(defaultEventKey(args, {})).toBe(eventKeyForEntry(args.forms[1]));
    expect(defaultEventKey(args, {})).not.toBe("form-undefined");
  });

  it("prefers latest temporary panel", () => {
    const args: SidebarEntries = {
      forms: [],
      temporaryPanels: [
        sidebarEntryFactory("temporaryPanel"),
        sidebarEntryFactory("temporaryPanel"),
      ],
      panels: [sidebarEntryFactory("panel")],
      staticPanels: [],
      modActivationPanel: null,
    } as SidebarEntries;

    expect(defaultEventKey(args, {})).toBe(
      eventKeyForEntry(args.temporaryPanels[1]),
    );
    expect(defaultEventKey(args, {})).not.toBe("temporaryPanel-undefined");
  });

  describe("panels", () => {
    it("prefers first panel", () => {
      const entries = {
        forms: [],
        temporaryPanels: [],
        panels: [sidebarEntryFactory("panel"), sidebarEntryFactory("panel")],
        staticPanels: [],
        modActivationPanel: null,
      } as SidebarEntries;

      expect(defaultEventKey(entries, {})).toBe(
        eventKeyForEntry(entries.panels[0]),
      );
      expect(defaultEventKey(entries, {})).not.toBe("panel-undefined");
    });

    it("ignores closed panels", () => {
      const firstPanel = sidebarEntryFactory("panel");
      const secondPanel = sidebarEntryFactory("panel");
      const entries = {
        forms: [],
        temporaryPanels: [],
        panels: [firstPanel, secondPanel],
        staticPanels: [],
        modActivationPanel: null,
      } as SidebarEntries;

      const closedTabs: SidebarState["closedTabs"] = {
        [eventKeyForEntry(firstPanel)]: true,
      };

      expect(defaultEventKey(entries, closedTabs)).toBe(
        eventKeyForEntry(entries.panels[1]),
      );
      expect(defaultEventKey(entries, closedTabs)).not.toBe("panel-undefined");
    });
  });

  describe("staticPanels", () => {
    it("returns static panel as last resort before returning null", () => {
      const args = {
        forms: [],
        temporaryPanels: [],
        panels: [],
        staticPanels: [MOD_LAUNCHER],
      } as unknown as SidebarEntries;

      expect(defaultEventKey(args, {})).toBe(eventKeyForEntry(MOD_LAUNCHER));
      expect(defaultEventKey(args, {})).not.toBe("panel-undefined");
    });

    it("ignores closed static panels", () => {
      const firstPanel = sidebarEntryFactory("staticPanel");
      const secondPanel = sidebarEntryFactory("staticPanel");
      const args = {
        forms: [],
        temporaryPanels: [],
        panels: [],
        staticPanels: [firstPanel, secondPanel],
      } as unknown as SidebarEntries;

      const closedTabs: SidebarState["closedTabs"] = {
        [eventKeyForEntry(firstPanel)]: true,
      };

      expect(defaultEventKey(args, closedTabs)).toBe(
        eventKeyForEntry(args.staticPanels[1]),
      );
      expect(defaultEventKey(args, closedTabs)).not.toBe("panel-undefined");
    });
  });
});

describe("eventKeyForEntry", () => {
  it.each([[undefined, null]])("returns null for %s", (value?: null) => {
    expect(eventKeyForEntry(value)).toBeNull();
  });

  it("uses recipeId for activateRecipe", () => {
    const recipeId = validateRegistryId("@test/test-recipe");
    const entry = sidebarEntryFactory("activateMods", { recipeId });
    // Main part is an object hash of the mod ids
    expect(eventKeyForEntry(entry)).toStartWith("activate-");
  });

  it("uses extensionId for panel", () => {
    const extensionId = uuidv4();
    const extensionPointId = validateRegistryId("@test/test-starter-brick");
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
      `temporaryPanel-${nonce}`,
    );
  });

  it("uses key for static panels", () => {
    const key = "test";
    const entry = sidebarEntryFactory("staticPanel", { key });
    expect(eventKeyForEntry(entry)).toBe(`static-${key}-panel`);
  });
});
