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

// https://transitory.technology/browser-extensions-and-csp-headers/
// Load the passed URL into another iframe to get around the parent page's CSP headers
// Until this is resolved: https://github.com/w3c/webextensions/issues/483

import { initCopilotMessenger } from "../contrib/automationanywhere/aaFrameProtocol";

const params = new URLSearchParams(window.location.search);

const frameUrl = params.get("url") ?? "";
const name = params.get("name") ?? "";

const iframe = document.createElement("iframe");
iframe.src = frameUrl;
iframe.name = name;
document.body.append(iframe);

// Handle an embedded AA Co-Pilot frame
void initCopilotMessenger();
