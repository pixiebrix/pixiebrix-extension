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

import "./contentScript.scss";
import "@/development/visualInjection";
import { uuidv4 } from "@/types/helpers";
import {
  isInstalledInThisSession,
  setInstalledInThisSession,
  setReadyInThisDocument,
  unsetReadyInThisDocument,
} from "@/contentScript/ready";
import { logPromiseDuration } from "@/utils";
import { onContextInvalidated } from "@/errors/contextInvalidated";
import {
  getActivatingBlueprint,
  setActivatingBlueprint,
} from "@/background/messenger/external/_implementation";

// See note in `@/contentScript/ready.ts` for further details about the lifecycle of content scripts
async function initContentScript() {
  const context = top === self ? "" : `in frame ${location.href}`;
  const uuid = uuidv4();

  if (isInstalledInThisSession()) {
    console.error(
      `contentScript: was requested twice in the same context, aborting injection ${context}`
    );
    return;
  }

  console.debug(`contentScript: importing ${uuid} ${context}`);

  setInstalledInThisSession();

  // Keeping the import separate ensures that no side effects are run until this point
  const contentScript = import(
    /* webpackChunkName: "contentScriptCore" */ "./contentScriptCore"
  );

  // "imported" timing includes the parsing of the file, which can take 500-1000ms
  void logPromiseDuration("contentScript: imported", contentScript);

  const { init } = await contentScript;
  await logPromiseDuration("contentScript: ready", init());
  setReadyInThisDocument(uuid);

  // eslint-disable-next-line promise/prefer-await-to-then -- It's an unrelated event listener
  void onContextInvalidated().then(() => {
    unsetReadyInThisDocument(uuid);
    console.debug("contentScript: invalidated", uuid);
  });

  const activatingBlueprint = getActivatingBlueprint();
  if (activatingBlueprint) {
    alert(`Activating blueprint: ${activatingBlueprint}`);
    setActivatingBlueprint(null);
  }
}

if (location.protocol === "https:") {
  // eslint-disable-next-line promise/prefer-await-to-then -- Top-level await isn't available
  void initContentScript().catch((error) => {
    throw new Error("Error initializing contentScript", { cause: error });
  });
} else {
  console.warn("Unsupported protocol", location.protocol);
}
