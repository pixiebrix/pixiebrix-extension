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

import { Transformer } from "@/types";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { type BlockArg, type BlockOptions, type Schema } from "@/core";
import { type PipelineExpression } from "@/runtime/mapArgs";
import { expectContext } from "@/utils/expectContext";
import {
  ensureSidebar,
  hideTemporarySidebarPanel,
  PANEL_HIDING_EVENT,
  showTemporarySidebarPanel,
} from "@/contentScript/sidebarController";
import { type PanelPayload } from "@/sidebar/types";
import {
  waitForTemporaryPanel,
  stopWaitingForTemporaryPanels,
} from "@/blocks/transformers/temporaryInfo/temporaryPanelProtocol";

class DisplayTemporaryInfo extends Transformer {
  static BLOCK_ID = validateRegistryId("@pixiebrix/display");
  defaultOutputKey = "infoOutput";

  constructor() {
    super(
      DisplayTemporaryInfo.BLOCK_ID,
      "Display Temporary Information",
      "A display title for the information, shown in the tab name"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "A display title for the temporary document",
      },
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The render pipeline for the temporary document",
      },
    },
    required: ["body"],
  };

  async transform(
    {
      title,
      body: bodyPipeline,
    }: BlockArg<{
      title: string;
      body: PipelineExpression;
    }>,
    {
      logger: {
        context: { extensionId },
      },
      ctxt,
      runPipeline,
      runRendererPipeline,
    }: BlockOptions
  ): Promise<unknown> {
    expectContext("contentScript");

    const nonce = uuidv4();
    const controller = new AbortController();

    await ensureSidebar();

    const payload = (await runRendererPipeline(bodyPipeline?.__value__ ?? [], {
      key: "body",
      counter: 0,
    })) as PanelPayload;

    showTemporarySidebarPanel({
      extensionId,
      nonce,
      heading: title,
      payload,
    });

    window.addEventListener(
      PANEL_HIDING_EVENT,
      () => {
        controller.abort();
      },
      {
        signal: controller.signal,
      }
    );

    controller.signal.addEventListener("abort", () => {
      hideTemporarySidebarPanel(nonce);
      void stopWaitingForTemporaryPanels([nonce]);
    });

    try {
      await waitForTemporaryPanel(nonce);
    } finally {
      controller.abort();
    }

    return {};
  }
}

export default DisplayTemporaryInfo;
