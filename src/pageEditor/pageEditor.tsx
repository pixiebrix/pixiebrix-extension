/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import "bootstrap/dist/css/bootstrap.min.css";
import "@/vendors/overrides.scss";
import "@/utils/layout.scss";

import "@/extensionContext";
import "@/development/darkMode";

import registerMessenger from "@/pageEditor/messenger/registration";

import ReactDOM from "react-dom";
import React from "react";
import Panel from "@/pageEditor/Panel";
import { watchNavigation } from "@/pageEditor/protocol";
import initGoogle from "@/contrib/google/initGoogle";
import { initToaster } from "@/utils/notify";

registerMessenger();
initGoogle();
watchNavigation();
initToaster();

ReactDOM.render(<Panel />, document.querySelector("#container"));
