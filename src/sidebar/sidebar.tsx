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

// Keep in order so precedence is preserved
import "@/vendors/theme/app/app.scss";
import "@/vendors/overrides.scss";
import "@/utils/layout.scss";
import "./sidebar.scss";

import "@/extensionContext";

import registerMessenger from "@/sidebar/messenger/registration";
import App from "@/sidebar/SidebarApp";
import ReactDOM from "react-dom";
import React from "react";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import registerContribBlocks from "@/contrib/registerContribBlocks";
import { initToaster } from "@/utils/notify";
import initGoogle from "@/contrib/google/initGoogle";
import { initPerformanceMonitoring } from "@/telemetry/performance";

function init(): void {
  ReactDOM.render(<App />, document.querySelector("#container"));
}

registerMessenger();
void initGoogle();
void initPerformanceMonitoring();
registerContribBlocks();
registerBuiltinBlocks();
initToaster();
init();
