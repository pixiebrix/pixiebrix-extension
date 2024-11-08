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
  addListener,
  type PanelListener,
  removeListener,
  updateTemporaryPanel,
} from "./receiverProtocol";
import { type TemporaryPanelEntry } from "../../../types/sidebarTypes";
import { validateTimedSequence } from "../../../types/helpers";

describe("receiverProtocol", () => {
  test("add/remove listener", async () => {
    const listener: PanelListener = {
      onUpdateTemporaryPanel: jest.fn(),
      onSetPanelNonce: jest.fn(),
    };

    addListener(listener);

    await updateTemporaryPanel(
      validateTimedSequence("2244668800223:00000000"),
      {
        title: "test",
      } as unknown as TemporaryPanelEntry,
    );

    expect(listener.onUpdateTemporaryPanel).toHaveBeenCalledWith({
      title: "test",
    });

    removeListener(listener);

    await updateTemporaryPanel(
      validateTimedSequence("2244668800223:00000000"),
      {
        title: "test",
      } as unknown as TemporaryPanelEntry,
    );

    expect(listener.onUpdateTemporaryPanel).toHaveBeenCalledTimes(1);
  });

  test("ignore stale messages", async () => {
    const listener: PanelListener = {
      onUpdateTemporaryPanel: jest.fn(),
      onSetPanelNonce: jest.fn(),
    };

    addListener(listener);

    await updateTemporaryPanel(
      validateTimedSequence("2244668800223:00000001"),
      {
        title: "test",
      } as unknown as TemporaryPanelEntry,
    );
    await updateTemporaryPanel(
      validateTimedSequence("2244668800223:00000000"),
      {
        title: "test",
      } as unknown as TemporaryPanelEntry,
    );

    expect(listener.onUpdateTemporaryPanel).toHaveBeenCalledTimes(1);
  });
});
