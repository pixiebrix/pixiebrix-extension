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

import "@/vendors/theme/app/app.scss";
import "@/utils/global.scss";
import "@/utils/layout.scss";
import "./options.scss";

import "@/extensionContext";
import "@/development/darkMode.js";

import { render } from "react-dom";
import React, { StrictMode } from "react";
import App from "@/extensionConsole/App";
import { initToaster } from "@/utils/notify";
import { initTelemetry } from "@/background/messenger/api";
import { initMessengerLogging } from "@/development/messengerLogging";
import { initPerformanceMonitoring } from "@/telemetry/performance";
import { initRuntimeLogging } from "@/development/runtimeLogging";
import { setPlatform } from "@/platform/platformContext";
import extensionPagePlatform from "@/extensionPages/extensionPagePlatform";

setPlatform(extensionPagePlatform);

async function init() {
  void initMessengerLogging();
  void initRuntimeLogging();
  initToaster();
  initTelemetry();
  try {
    await initPerformanceMonitoring();
  } catch (error) {
    console.error("Failed to initialize performance monitoring", error);
  }

  render(
    <StrictMode>
      <App />
    </StrictMode>,
    document.querySelector("#container"),
  );
}

void init();
