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

import {
  cancelTemporaryPanels,
  getPanelDefinition,
  stopWaitingForTemporaryPanels,
  waitForTemporaryPanel,
  resolveTemporaryPanel,
} from "@/blocks/transformers/temporaryInfo/temporaryPanelProtocol";
import { uuidv4 } from "@/types/helpers";
import { CancelError } from "@/errors/businessErrors";

import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";

describe("temporaryPanelProtocol", () => {
  it("getPanelDefinition if panel is not defined", async () => {
    await expect(async () => getPanelDefinition(uuidv4())).rejects.toThrow(
      Error
    );
  });

  it("stopWaitingForTemporaryPanels resolves promise", async () => {
    const nonce = uuidv4();
    const definition = sidebarEntryFactory("temporaryPanel", { nonce });

    const promise = waitForTemporaryPanel(nonce, definition);

    await expect(getPanelDefinition(nonce)).resolves.toStrictEqual(definition);

    await stopWaitingForTemporaryPanels([nonce]);

    await expect(promise).resolves.toBeUndefined();
  });

  it("resolveTemporaryPanel resolves promise", async () => {
    const nonce = uuidv4();
    const definition = sidebarEntryFactory("temporaryPanel", { nonce });

    const promise = waitForTemporaryPanel(nonce, definition);

    await expect(getPanelDefinition(nonce)).resolves.toStrictEqual(definition);

    const action = { type: "submit", detail: { foo: "bar" } };

    await resolveTemporaryPanel(nonce, action);

    await expect(promise).resolves.toStrictEqual(action);
  });

  it("cancelTemporaryPanels rejects promise", async () => {
    const nonce = uuidv4();
    const definition = sidebarEntryFactory("temporaryPanel", { nonce });

    const promise = waitForTemporaryPanel(nonce, definition);

    await expect(getPanelDefinition(nonce)).resolves.toStrictEqual(definition);

    await cancelTemporaryPanels([nonce]);

    await expect(promise).rejects.toThrow(CancelError);
  });
});
