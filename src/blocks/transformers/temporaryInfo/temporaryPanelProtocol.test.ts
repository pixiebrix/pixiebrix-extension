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
} from "@/blocks/transformers/temporaryInfo/temporaryPanelProtocol";
import { uuidv4 } from "@/types/helpers";
import { TemporaryPanelEntry } from "@/sidebar/types";
import { CancelError } from "@/errors/businessErrors";

describe("temporaryPanelProtocol", () => {
  it("getPanelDefinition if panel is not defined", async () => {
    await expect(async () => getPanelDefinition(uuidv4())).rejects.toThrow(
      Error
    );
  });

  it("stopWaitingForTemporaryPanels resolves promise", async () => {
    const nonce = uuidv4();
    const extensionId = uuidv4();
    const definition: TemporaryPanelEntry = {
      nonce,
      heading: "Test",
      extensionId,
      payload: {} as any,
    };

    const promise = waitForTemporaryPanel(nonce, definition);

    await expect(getPanelDefinition(nonce)).resolves.toStrictEqual(definition);

    await stopWaitingForTemporaryPanels([nonce]);

    await expect(promise).resolves.toBeUndefined();
  });

  it("cancelTemporaryPanels rejects promise", async () => {
    const nonce = uuidv4();
    const extensionId = uuidv4();
    const definition: TemporaryPanelEntry = {
      nonce,
      heading: "Test",
      extensionId,
      payload: {} as any,
    };

    const promise = waitForTemporaryPanel(nonce, definition);

    await expect(getPanelDefinition(nonce)).resolves.toStrictEqual(definition);

    await cancelTemporaryPanels([nonce]);

    await expect(promise).rejects.toThrow(CancelError);
  });
});
