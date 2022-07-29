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

import "./contentScript.scss";
import { uuidv4 } from "@/types/helpers";
import { PIXIEBRIX_CONTENT_SCRIPT_NONCE } from "@/common";

async function initContentScript() {
  const uuid = uuidv4();

  console.time("contentScript ready");
  const existingAttribute = document.documentElement.getAttribute(
    PIXIEBRIX_CONTENT_SCRIPT_NONCE
  );
  if (existingAttribute) {
    console.debug(
      `PixieBrix contentScript already installed: ${existingAttribute}`
    );

    return;
  }

  document.documentElement.setAttribute(PIXIEBRIX_CONTENT_SCRIPT_NONCE, uuid);

  // Keeping the import separate ensures that no side effects are run until this point
  const { init } = await import(
    /* webpackChunkName: "contentScriptCore" */ "./contentScriptCore"
  );
  await init(uuid);
  console.timeEnd("contentScript ready");
}

void initContentScript();
