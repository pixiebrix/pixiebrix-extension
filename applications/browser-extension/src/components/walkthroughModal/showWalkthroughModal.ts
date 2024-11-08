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

import { expectContext } from "../../utils/expectContext";
import { getThisFrame } from "webext-messenger";
import { registerWalkthroughModal } from "@/contentScript/walkthroughModalProtocol";
import reportEvent from "../../telemetry/reportEvent";
import { Events } from "../../telemetry/events";
import { showModal } from "@/contentScript/modalDom";

const showWalkthroughModal = async () => {
  expectContext("contentScript");

  const controller = new AbortController();
  const target = await getThisFrame();

  const frameSource = new URL(browser.runtime.getURL("walkthroughModal.html"));
  frameSource.searchParams.set("opener", JSON.stringify(target));

  const modal = registerWalkthroughModal();
  showModal({ url: frameSource, controller });

  try {
    await modal;
  } finally {
    reportEvent(Events.PAGE_EDITOR_WALKTHROUGH_MODAL_CLOSE);
    controller.abort();
  }
};

export default showWalkthroughModal;
