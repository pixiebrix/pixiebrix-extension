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

import { browserAction } from "../mv3/api";
import {
  DEFAULT_BADGE_COLOR,
  setToolbarBadge,
} from "./toolbarBadge";
import { messengerMetaFactory } from "../testUtils/factories/messengerFactories";

jest.mock("../mv3/api", () => ({
  browserAction: {
    setBadgeBackgroundColor: jest.fn(),
    setBadgeText: jest.fn(),
  },
}));

describe("setToolbarBadge", () => {
  it("calls browserAction.setBadgeText with given text", async () => {
    const expectedText = "test";
    const messengerMeta = messengerMetaFactory();
    const expectedTabId = messengerMeta.trace?.[0]?.tab?.id;
    await setToolbarBadge.call(messengerMeta, expectedText);

    expect(browserAction.setBadgeText).toHaveBeenCalledWith({
      text: expectedText,
      tabId: expectedTabId,
    });

    expect(browserAction.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: DEFAULT_BADGE_COLOR,
      tabId: expectedTabId,
    });
  });
});
