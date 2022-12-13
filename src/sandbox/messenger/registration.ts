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

/** @file It doesn't actually use the Messenger but this file tries to replicate the pattern */

import { addPostMessageListener } from "@/utils/postMessage";
import { applyJq, renderNunjucksTemplate } from "./executor";

export default function registerMessenger(): void {
  addPostMessageListener("SANDBOX_PING", async (payload) => "pong");
  addPostMessageListener("RENDER_NUNJUCKS", renderNunjucksTemplate);
  addPostMessageListener("APPLY_JQ", applyJq);
}
