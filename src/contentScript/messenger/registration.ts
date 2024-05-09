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

/**
 * @file
 * Do not use `getMethod` in this file; Keep only registrations here, not implementations
 *
 * `strictNullCheck errors` context: https://github.com/pixiebrix/pixiebrix-extension/issues/6526
 */

import { registerMethods } from "webext-messenger";
import { expectContext } from "@/utils/expectContext";
import {
  activatePrerenderedTab,
  ensureInstalled,
  getActiveExtensionPoints,
  queueReactivateTab,
  reactivateTab,
  removePersistedExtension,
} from "@/contentScript/lifecycle"; // 196 strictNullCheck errors
import { clearDynamicElements } from "@/contentScript/pageEditor/dynamic/clearDynamicElements"; // Depends on contentScript/lifecycle to pass strictNullCheck
import { runStarterBrickReader } from "@/contentScript/pageEditor/dynamic/runStarterBrickReader"; // Depends on contentScript/messenger to pass strictNullCheck
import { updateDynamicElement } from "@/contentScript/pageEditor/dynamic/updateDynamicElement"; // Depends on contentScript/lifecycle to pass strictNullCheck
import { resetTab } from "@/contentScript/pageEditor/resetTab"; // Depends on contentScript/lifecycle to pass strictNullCheck
import { runRendererBlock } from "@/contentScript/pageEditor/runRendererBlock"; // Depends on background/messenger
import { runHeadlessPipeline } from "@/contentScript/pipelineProtocol/runHeadlessPipeline"; // Depends on background/messenger
import { runRendererPipeline } from "@/contentScript/pipelineProtocol/runRendererPipeline"; // Depends on background/messenger

expectContext("contentScript");

declare global {
  interface MessengerMethods {
    QUEUE_REACTIVATE_TAB: typeof queueReactivateTab;
    REACTIVATE_TAB: typeof reactivateTab;
    REMOVE_INSTALLED_EXTENSION: typeof removePersistedExtension;
    RESET_TAB: typeof resetTab;
    ACTIVATE_PRERENDERED_TAB: typeof activatePrerenderedTab;

    RUN_RENDERER_BLOCK: typeof runRendererBlock;

    CLEAR_DYNAMIC_ELEMENTS: typeof clearDynamicElements;
    UPDATE_DYNAMIC_ELEMENT: typeof updateDynamicElement;
    RUN_EXTENSION_POINT_READER: typeof runStarterBrickReader;

    INSTALLED_EXTENSION_POINTS: typeof getActiveExtensionPoints;
    ENSURE_EXTENSION_POINTS_INSTALLED: typeof ensureInstalled;

    RUN_RENDERER_PIPELINE: typeof runRendererPipeline;
    RUN_HEADLESS_PIPELINE: typeof runHeadlessPipeline;
  }
}

export default function registerMessenger(): void {
  registerMethods({
    QUEUE_REACTIVATE_TAB: queueReactivateTab,
    REACTIVATE_TAB: reactivateTab,
    REMOVE_INSTALLED_EXTENSION: removePersistedExtension,
    RESET_TAB: resetTab,
    ACTIVATE_PRERENDERED_TAB: activatePrerenderedTab,

    RUN_RENDERER_BLOCK: runRendererBlock,

    CLEAR_DYNAMIC_ELEMENTS: clearDynamicElements,
    UPDATE_DYNAMIC_ELEMENT: updateDynamicElement,
    RUN_EXTENSION_POINT_READER: runStarterBrickReader,

    INSTALLED_EXTENSION_POINTS: getActiveExtensionPoints,
    ENSURE_EXTENSION_POINTS_INSTALLED: ensureInstalled,

    RUN_RENDERER_PIPELINE: runRendererPipeline,
    RUN_HEADLESS_PIPELINE: runHeadlessPipeline,
  });
}
