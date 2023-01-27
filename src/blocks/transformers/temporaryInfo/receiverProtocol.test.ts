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
  addListener,
  PanelListener,
  removeListener,
  updateTemporaryPanel,
} from "@/blocks/transformers/temporaryInfo/receiverProtocol";

describe("receiverProtocol", () => {
  test("add/remove listener", async () => {
    const listener: PanelListener = {
      onUpdateTemporaryPanel: jest.fn(),
    };

    addListener(listener);

    await updateTemporaryPanel(0, { title: "test" } as any);

    expect(listener.onUpdateTemporaryPanel).toHaveBeenCalledWith({
      title: "test",
    });

    removeListener(listener);

    await updateTemporaryPanel(0, { title: "test" } as any);

    expect(listener.onUpdateTemporaryPanel).toHaveBeenCalledTimes(1);
  });

  test("ignore stale messages", async () => {
    const listener: PanelListener = {
      onUpdateTemporaryPanel: jest.fn(),
    };

    addListener(listener);

    await updateTemporaryPanel(1, { title: "test" } as any);
    await updateTemporaryPanel(0, { title: "test" } as any);

    expect(listener.onUpdateTemporaryPanel).toHaveBeenCalledTimes(1);
  });
});
