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
  isReadyInThisDocument,
  setInstalledInThisSession,
  setReadyInThisDocument,
  unsetReadyInThisDocument,
} from "@/contentScript/ready";
import { logPromiseDuration } from "@/utils";
import { onContextInvalidated } from "@/errors/contextInvalidated";

// See note in `@/contentScript/ready.ts` for further details about the lifecycle of content scripts
async function initContentScript() {
  const uuid = uuidv4();

  if (isInstalledInThisSession()) {
    console.error(
      "contentScript: was requested twice in the same context, aborting injection"
    );
    return;
  }

  if (isReadyInThisDocument()) {
    console.warn(
      "contentScript: injecting again because the previous context was invalidated"
    );
  } else {
    console.debug(`contentScript: injecting ${uuid}`);
  }

  setInstalledInThisSession();

  // Keeping the import separate ensures that no side effects are run until this point
  const contentScript = import(
    /* webpackChunkName: "contentScriptCore" */ "./contentScriptCore"
  );

  // "imported" timing includes the parsing of the file, which can take 500-1000ms
  void logPromiseDuration("contentScript: imported", contentScript);

  const { init } = await contentScript;
  await init(uuid);
  setReadyInThisDocument(uuid);

  // eslint-disable-next-line promise/prefer-await-to-then -- It's an unrelated event listener
  void onContextInvalidated().then(() => {
    unsetReadyInThisDocument(uuid);
    console.debug("contentScript: invalidated", uuid);
  });
}

void logPromiseDuration("contentScript: ready", initContentScript()).catch(
  (error) => {
    throw new Error("Error initializing contentScript", { cause: error });
  }
);
