/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import "@/extensionContext";

// Init rollbar early so we get error reporting on the other initialization
import "@/telemetry/rollbar";

import App from "@/actionPanel/ActionPanelApp";
import ReactDOM from "react-dom";
import React from "react";

import { browserAction } from "@/background/messenger/api";
import { UUID } from "@/core";
import "@/actionPanel/protocol";

// Keep in order so precedence is preserved
import "@/vendors/theme/app/app.scss";
import "@/vendors/overrides.scss";
import "@/action.scss";

const url = new URL(location.href);
const nonce = url.searchParams.get("nonce") as UUID;

void browserAction.registerActionFrame(nonce).then(() => {
  console.debug("Registered action frame with background page");
});

ReactDOM.render(<App />, document.querySelector("#container"));
