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

import type { PlatformProtocol } from "@/platform/platformProtocol";
import { platformCapabilities } from "@/platform/capabilities";
import ConsoleLogger from "@/utils/ConsoleLogger";
import type { Logger } from "@/types/loggerTypes";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import type { RunArgs } from "@/types/runtimeTypes";
import { normalizeSemVerString } from "@/types/helpers";
import type { ToastProtocol } from "@/platform/platformTypes/toastProtocol";

/**
 * Implementation of PlatformProtocol that mocks all methods
 */
export const platformMock: PlatformProtocol = {
  platformName: "mock",
  version: normalizeSemVerString("0.0.0"),
  capabilities: platformCapabilities,
  open: jest.fn(),
  alert: jest.fn(),
  prompt: jest.fn(),
  userSelectElementRefs: jest.fn(),
  request: jest.fn(),
  runSandboxedJavascript: jest.fn(),
  form: jest.fn(),
  audio: {
    play: jest.fn(),
  },
  capture: {
    captureScreenshot: jest.fn(),
    startAudioCapture: jest.fn(),
    stopAudioCapture: jest.fn(),
  },
  badge: {
    setText: jest.fn(),
  },
  contextMenus: {
    register: jest.fn(),
    unregister: jest.fn(),
  },
  state: {
    getState: jest.fn(),
    setState: jest.fn(),
    registerModVariables: jest.fn(),
    addModVariableChangeListener: jest.fn(),
  },
  templates: {
    render: jest.fn(),
    validate: jest.fn(),
  },
  clipboard: {
    write: jest.fn(),
  },
  textSelectionMenu: {
    register: jest.fn(),
    unregister: jest.fn(),
  },
  snippetShortcutMenu: {
    register: jest.fn(),
    unregister: jest.fn(),
  },
  quickBar: {
    addAction: jest.fn(),
    knownGeneratorRootIds: new Set<string>(),
  },
  get logger(): Logger {
    return new ConsoleLogger();
  },
  get toasts(): ToastProtocol {
    return {
      showNotification: jest.fn(),
      hideNotification: jest.fn(),
    };
  },
  get debugger() {
    return {
      clear: jest.fn(),
      traces: {
        enter: jest.fn(),
        exit: jest.fn(),
      },
    };
  },
  get panels() {
    return {
      isContainerVisible: jest.fn(),
      unregisterStarterBrick: jest.fn(),
      removeComponents: jest.fn(),
      reservePanels: jest.fn(),
      updateHeading: jest.fn(),
      upsertPanel: jest.fn(),
      showEvent: new SimpleEventTarget<RunArgs>(),
      showTemporary: jest.fn(),
    };
  },
};
