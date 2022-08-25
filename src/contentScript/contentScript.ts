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

// IMPORTANT: do not import anything that has a transitive dependency of the messenger.
// See for more information: https://github.com/pixiebrix/pixiebrix-extension/issues/4058
import "./contentScript.scss";
import { uuidv4 } from "@/types/helpers";
import {
  isInstalledInThisSession,
  isReadyInThisDocument,
  setInstalledInThisSession,
  setReadyInThisDocument,
} from "@/contentScript/ready";
import { logPromiseDuration } from "@/utils";

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
  const { init } = await logPromiseDuration(
    "contentScript: imported", // "imported" timing includes the parsing of the file, which can take 500-1000ms
    import(/* webpackChunkName: "contentScriptCore" */ "./contentScriptCore")
  );
  await init(uuid);
  setReadyInThisDocument(uuid);
}

void logPromiseDuration("contentScript: ready", initContentScript()).catch(
  (error) => {
    throw new Error("Error initializing contentScript", { cause: error });
  }
);
