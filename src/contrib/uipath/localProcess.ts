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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import type { JobResult } from "@uipath/robot/dist/models";
import { validateRegistryId } from "@/types/helpers";
import { BusinessError } from "@/errors/businessErrors";
import { type Schema, type SchemaProperties } from "@/types/schemaTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import type { UnknownObject } from "@/types/objectTypes";
import {
  CONTENT_SCRIPT_CAPABILITIES,
  type PlatformCapability,
} from "@/platform/capabilities";
import { expectContext } from "@/utils/expectContext";

const UIPATH_PROPERTIES: SchemaProperties = {
  releaseKey: {
    type: "string",
    description: "The local UiPath process id",
  },
  inputArguments: {
    type: "object",
    additionalProperties: true,
  },
};

class RunLocalProcess extends TransformerABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/uipath/local-process");

  constructor() {
    super(
      RunLocalProcess.BRICK_ID,
      "Run local UiPath process",
      "Run a UiPath process using your local UiPath assistant",
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["releaseKey"],
    properties: UIPATH_PROPERTIES,
  };

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    // Required for UiPath Robot
    return CONTENT_SCRIPT_CAPABILITIES;
  }

  async transform(
    {
      releaseKey,
      inputArguments = {},
    }: BrickArgs<{
      releaseKey: string;
      inputArguments: UnknownObject;
    }>,
    { logger }: BrickOptions,
  ): Promise<JobResult> {
    // XXX: not worth adding to the platform definition because it will only be available in webext platform for now
    expectContext(
      "contentScript",
      "UiPath Robot JavaScript SDK can only be loaded in the content script",
    );

    const { UiPathRobot } = await import(
      /* webpackChunkName: "uipath-robot" */ "@/contrib/uipath/UiPathRobot"
    );

    return Promise.race([
      // Throw error if Assistant is missing
      new Promise<JobResult>((resolve, reject) => {
        UiPathRobot.on("missing-components", () => {
          reject(new Error("UiPath Assistant not found. Is it installed?"));
        });
      }),

      // Run requested process
      (async () => {
        const processes = await UiPathRobot.init().getProcesses();

        const process = processes.find((x) => x.id === releaseKey);
        if (!process) {
          // `releaseKey`'s type is checked in the inputSchema
          logger.error(`Cannot find UiPath release: ${releaseKey}`);
          throw new BusinessError("Cannot find UiPath release");
        }

        console.debug("Running local UiPath process", { releaseKey });
        const result = await process.start(inputArguments);
        console.debug("Forwarding result from local UiPath process", {
          result,
          releaseKey,
        });
        return result;
      })(),
    ]);
  }
}

export default RunLocalProcess;
