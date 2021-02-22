/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema, SchemaProperties } from "@/core";

export const UIPATH_ID = "@pixiebrix/uipath/local-process";

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

export class RunLocalProcess extends Effect {
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

  async effect({ releaseKey, inputArguments = {} }: BlockArg): Promise<void> {
    const module = await import(
      /* webpackChunkName: "uipath" */
      "@uipath/robot"
    );

    const { UiPathRobot } = module.default;

    return new Promise((resolve, reject) => {
      UiPathRobot.on("missing-components", () => {
        reject(new Error("UiPath Assistant not found. Is it installed?"));
      });
      const robot = UiPathRobot.init();
      robot.getProcesses().then((processes) => {
        const process = processes.find((x) => x.id === releaseKey);
        if (!process) {
          throw new Error(`Can't find process ${releaseKey}`);
        }
        process.start(inputArguments);
        resolve();
      });
    });
  }
}

registerBlock(new RunLocalProcess());
