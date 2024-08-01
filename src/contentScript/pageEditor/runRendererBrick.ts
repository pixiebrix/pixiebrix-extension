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

import { serializeError } from "serialize-error";

import { CancelError, NoRendererError } from "@/errors/businessErrors";
import { uuidv4 } from "@/types/helpers";
import { type PanelPayload } from "@/types/sidebarTypes";
import { HeadlessModeError } from "@/bricks/errors";
import { showTemporarySidebarPanel } from "@/contentScript/sidebarController";
import { waitForTemporaryPanel } from "@/platform/panels/panelController";
import { type UUID } from "@/types/stringTypes";
import { createFrameSource } from "@/contentScript/ephemeralPanel";
import { showModal } from "@/contentScript/modalDom";
import { runBrickPreview } from "@/contentScript/pageEditor/runBrickPreview";
import { type RunBrickArgs } from "@/contentScript/pageEditor/types";
import { type ModComponentRef } from "@/types/modComponentTypes";

type Location = "modal" | "panel";

/**
 * Run a single renderer (e.g. - for running a block preview)
 *
 * Renderers need to be run with try-catch, catch the HeadlessModeError, and
 * use that to send the panel payload to the sidebar (or other target)
 * @see SidebarExtensionPoint
 *  starting on line 184, the call to reduceExtensionPipeline(),
 *  wrapped in a try-catch
 * @see executeBlockWithValidatedProps
 *  starting on line 323, the runRendererPipeline() function
 *
 * Note: Currently only implemented for the temporary sidebar panels
 * @see useDocumentPreviewRunBlock
 */
export async function runRendererBrick({
  modComponentRef,
  runId,
  title,
  args,
  location,
}: {
  modComponentRef: ModComponentRef;
  runId: UUID;
  title: string;
  args: RunBrickArgs;
  location: Location;
}): Promise<void> {
  const nonce = uuidv4();

  let payload: PanelPayload;
  try {
    await runBrickPreview({ ...args, modComponentRef });
    // We're expecting a HeadlessModeError (or other error) to be thrown in the line above
    // noinspection ExceptionCaughtLocallyJS
    throw new NoRendererError();
  } catch (error) {
    if (error instanceof HeadlessModeError) {
      payload = {
        key: nonce,
        brickId: error.brickId,
        args: error.args,
        ctxt: error.ctxt,
        modComponentRef,
        runId,
      };
    } else {
      payload = {
        key: nonce,
        error: serializeError(error),
        modComponentRef,
        runId,
      };
    }

    if (location === "panel") {
      await showTemporarySidebarPanel({
        // Pass component ref id so previous run is cancelled
        modComponentRef,
        nonce,
        heading: title,
        payload,
      });
    } else if (location === "modal") {
      const controller = new AbortController();
      const url = await createFrameSource(nonce, "modal");

      showModal({ url, controller });

      try {
        await waitForTemporaryPanel({
          nonce,
          location,
          modComponentId: modComponentRef.modComponentId,
          entry: {
            modComponentRef,
            nonce,
            heading: title,
            payload,
          },
        });
      } catch (error) {
        // Match behavior of Display Temporary Info
        if (error instanceof CancelError) {
          // NOP
        } else {
          throw error;
        }
      } finally {
        controller.abort();
      }
    } else {
      const exhaustiveCheck: never = location;
      throw new Error(
        `Support for previewing in ${exhaustiveCheck} not implemented`,
      );
    }
  }
}
