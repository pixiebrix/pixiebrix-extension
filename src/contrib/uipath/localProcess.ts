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
import { BlockArg, BlockOptions, Schema, SchemaProperties } from "@/core";
import UiPathRobot from "@/contrib/uipath/UiPathRobot";
import { JobResult } from "@uipath/robot/dist/models";
import { BusinessError } from "@/errors";
import { validateRegistryId } from "@/types/helpers";

UiPathRobot.settings.disableTelemetry = true;

export const UIPATH_ID = validateRegistryId("@pixiebrix/uipath/local-process");

export const UIPATH_PROPERTIES: SchemaProperties = {
  releaseKey: {
    type: "string",
    description: "The local UiPath process id",
  },
  inputArguments: {
    type: "object",
    additionalProperties: true,
  },
};

export class RunLocalProcess extends Transformer {
  constructor() {
    super(
      UIPATH_ID,
      "Run local UiPath process",
      "Run a UiPath process using your local UiPath assistant"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["releaseKey"],
    properties: UIPATH_PROPERTIES,
  };

  async transform(
    { releaseKey, inputArguments = {} }: BlockArg,
    { logger }: BlockOptions
  ): Promise<JobResult> {
    return Promise.race([
      // Throw error if Assistant is missing
      new Promise((_, reject) => {
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
          logger.error(`Cannot find UiPath release: ${releaseKey as string}`);
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
