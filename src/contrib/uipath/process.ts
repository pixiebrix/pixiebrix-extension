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

import { proxyService } from "@/background/requests";
import { Effect } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, Schema, SchemaProperties } from "@/core";
import { partial } from "lodash";

export const UIPATH_PROPERTIES: SchemaProperties = {
  uipath: {
    $ref: "https://app.pixiebrix.com/schemas/services/uipath/cloud",
  },
  releaseKey: {
    type: "string",
  },
  strategy: {
    type: "string",
    default: "JobsCount",
    enum: ["All", "Specific", "JobsCount"],
    description: "How the process should be run",
  },
  robotIds: {
    type: "array",
    items: {
      type: "number",
    },
  },
  jobsCount: {
    type: "number",
    description:
      "When using strategy JobsCount, the process will run x times where x is the value of the JobsCount field.",
  },
  inputArguments: {
    type: "object",
    additionalProperties: true,
  },
};

export class RunProcess extends Effect {
  constructor() {
    super(
      "@pixiebrix/uipath/process",
      "Run a UIPath process",
      "Run a UIPath process using UIPath Cloud Orchestrator"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["uipath", "releaseKey"],
    properties: UIPATH_PROPERTIES,
  };

  async effect({
    uipath,
    releaseKey,
    strategy = "JobsCount",
    jobsCount = 0,
    robotIds = [],
    inputArguments = {},
  }: BlockArg): Promise<void> {
    const proxyUIPath = partial(proxyService, uipath);

    await proxyUIPath({
      url: `/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs`,
      method: "post",
      data: {
        startInfo: {
          ReleaseKey: releaseKey,
          Strategy: strategy,
          JobsCount: jobsCount,
          RobotIds: robotIds,
          Source: "Manual",
          InputArguments: JSON.stringify(inputArguments),
        },
      },
    });
  }
}

registerBlock(new RunProcess());
