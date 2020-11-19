/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import "regenerator-runtime/runtime";
import "core-js/stable";

import "@/extensionContext";
import { initRollbar } from "@/telemetry/rollbar";

import "webpack-target-webextension/lib/background";
import "webext-dynamic-content-scripts";

// init first so we get error reporting on the other initialization
initRollbar();

import "./background/installer";
import "./messaging/external";
import "./background/requests";
import "./background/locator";
import "./background/logging";
import "./background/auth";
import "./background/contextMenus";

import initGoogle from "@/contrib/google/background";
import initFrames from "@/background/iframes";
import initNavigation from "@/background/navigation";
import initExecutor from "@/background/executor";

initNavigation();
initExecutor();
initGoogle();
initFrames();
