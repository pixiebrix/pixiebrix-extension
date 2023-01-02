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

import { defaultEventKey, mapTabEventKey } from "@/sidebar/utils";
import { uuidv4 } from "@/types/helpers";
import { type FormEntry, type TemporaryPanelEntry } from "@/sidebar/types";

describe("defaultEventKey", () => {
  it("returns null no content", () => {
    expect(
      defaultEventKey({
        forms: [],
        panels: [],
        temporaryPanels: [],
      })
    ).toBe(null);
  });

  it("prefers latest form", () => {
    const args = {
      forms: [{ nonce: uuidv4() }, { nonce: uuidv4() }] as FormEntry[],
      temporaryPanels: [{ nonce: uuidv4() }] as TemporaryPanelEntry[],
      panels: [{ extensionId: uuidv4() }],
    } as any;

    expect(defaultEventKey(args)).toBe(mapTabEventKey("form", args.forms[1]));
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
      mapTabEventKey("temporaryPanel", args.temporaryPanels[1])
    );
    expect(defaultEventKey(args)).not.toBe("temporaryPanel-undefined");
  });

  it("prefers first panel", () => {
    const args = {
      forms: [] as FormEntry[],
      temporaryPanels: [] as TemporaryPanelEntry[],
      panels: [{ extensionId: uuidv4() }, { extensionId: uuidv4() }],
    } as any;

    expect(defaultEventKey(args)).toBe(mapTabEventKey("panel", args.panels[0]));
    expect(defaultEventKey(args)).not.toBe("panel-undefined");
  });
});

describe("mapTabEventKey", () => {
  it.each([[undefined, null]])("returns null for %s", (value) => {
    expect(mapTabEventKey("form", value)).toBe(null);
  });

  it("prefers nonce", () => {
    const nonce = uuidv4();
    expect(mapTabEventKey("form", { nonce, extensionId: uuidv4() })).toBe(
      `form-${nonce}`
    );
  });

  it("uses extension id", () => {
    const extensionId = uuidv4();
    expect(mapTabEventKey("panel", { extensionId })).toBe(
      `panel-${extensionId}`
    );
  });
});
