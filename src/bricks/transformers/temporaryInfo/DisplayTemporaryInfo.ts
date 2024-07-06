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

import { validateRegistryId } from "@/types/helpers";
import {
  type BrickArgs,
  type BrickOptions,
  type PipelineExpression,
} from "@/types/runtimeTypes";
import { expectContext } from "@/utils/expectContext";
import { IS_ROOT_AWARE_BRICK_PROPS } from "@/bricks/rootModeHelpers";
import { type JsonObject } from "type-fest";
import { TransformerABC } from "@/types/bricks/transformerTypes";
import { type Schema } from "@/types/schemaTypes";
import { type Location } from "@/types/starterBrickTypes";
import { assumeNotNullish_UNSAFE } from "@/utils/nullishUtils";
import type {
  RefreshTrigger,
  TemporaryPanelEntryMetadata,
} from "@/platform/panels/panelTypes";

class DisplayTemporaryInfo extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/display");
  override defaultOutputKey = "infoOutput";

  constructor() {
    super(
      DisplayTemporaryInfo.BRICK_ID,
      "Display Temporary Information",
      "Display a document in a temporary sidebar panel",
    );
  }

  override async isRootAware(): Promise<boolean> {
    return true;
  }

  inputSchema: Schema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "A display title for the temporary document, shown in the tab name",
      },
      body: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The render pipeline for the temporary document",
      },
      location: {
        type: "string",
        title: "Location",
        oneOf: [
          { const: "panel", title: "Sidebar" },
          { const: "modal", title: "Modal" },
          { const: "popover", title: "Popover" },
        ],
        default: "panel",
        description: "The location of the information (default='Sidebar')",
      },
      refreshTrigger: {
        type: "string",
        title: "Refresh Trigger",
        oneOf: [
          { const: "manual", title: "Manual" },
          { const: "statechange", title: "Mod Variable/Page State Changed" },
        ],
        description: "An optional trigger for refreshing the document",
      },
      ...IS_ROOT_AWARE_BRICK_PROPS,
    },
    required: ["body"],
  };

  async transform(
    {
      title,
      body: bodyPipeline,
      location = "panel",
      refreshTrigger = "manual",
      isRootAware = false,
    }: BrickArgs<{
      title: string;
      location: Location;
      refreshTrigger: RefreshTrigger;
      body: PipelineExpression;
      isRootAware: boolean;
    }>,
    {
      logger: {
        context: { extensionId, blueprintId, extensionPointId },
      },
      root = document,
      platform,
      runRendererPipeline,
      abortSignal,
    }: BrickOptions,
  ): Promise<JsonObject | null> {
    expectContext("contentScript");

    const target = isRootAware ? root : document;
    assumeNotNullish_UNSAFE(extensionId);
    assumeNotNullish_UNSAFE(extensionPointId);
    // XXX: blueprintId can actually be nullish if not running on the context of a mod. But assume it's non-nullish
    //  for passing to the panel for now. The panel can gracefully handle nullish blueprintId.
    assumeNotNullish_UNSAFE(blueprintId);

    // Counter for tracking branch execution
    let counter = 0;

    const panelEntryMetadata: TemporaryPanelEntryMetadata = {
      heading: title,
      modComponentRef: {
        extensionId,
        blueprintId,
        extensionPointId,
      },
    };

    const getPayload = async () => {
      const result = await runRendererPipeline(
        bodyPipeline,
        {
          key: "body",
          counter,
        },
        {},
        target,
      );

      counter++;

      return result;
    };

    return platform.panels.showTemporary({
      panelEntryMetadata,
      getPayload,
      location,
      signal: abortSignal,
      target,
      refreshTrigger,
    });
  }
}

export default DisplayTemporaryInfo;
