/*
 * Copyright (C) 2021 Pixie Brix, LLC
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

import "@/extensionContext";

// init rollbar early so we get error reporting on the other initialization
import "@/telemetry/rollbar";

import App from "./actionPanel/ActionPanelApp";
import ReactDOM from "react-dom";
import React from "react";
import { browser } from "webextension-polyfill-ts";

import { REGISTER_ACTION_FRAME } from "@/background/browserAction";
import { reportError } from "@/telemetry/logging";
import "@/actionPanel/protocol";

// keep in order so precedence is preserved
import "vendors/theme/app/app.scss";
import "./action.scss";
import "@/vendors/overrides.scss";

const url = new URL(location.href);
const nonce = url.searchParams.get("nonce");

browser.runtime
  .sendMessage({
    type: REGISTER_ACTION_FRAME,
    payload: { nonce },
  })
  .then(() => {
    console.debug("Registered action frame with background page");
  })
  .catch(reportError);

ReactDOM.render(<App />, document.querySelector("#container"));
