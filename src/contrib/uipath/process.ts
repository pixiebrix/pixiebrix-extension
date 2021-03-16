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
import { Transformer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, BlockOptions, Schema, SchemaProperties } from "@/core";
import { Permissions } from "webextension-polyfill-ts";
import { sleep } from "@/utils";

export const UIPATH_ID = "@pixiebrix/uipath/process";

const MAX_WAIT_MILLIS = 20_000;
const POLL_MILLIS = 1_000;

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
  awaitResult: {
    type: "boolean",
    default: false,
    description: "Wait for the process to complete and output the results.",
  },
  inputArguments: {
    type: "object",
    additionalProperties: true,
  },
};

export const UIPATH_PERMISSIONS: Permissions.Permissions = {
  origins: ["https://*.uipath.com/*"],
};

interface JobsResponse {
  "@odata.context": "https://cloud.uipath.com/odata/$metadata#Jobs";
  "@odata.count": number;
  value: {
    Id: number;
    Key: string;
    State: "Successful" | "Pending" | "Faulted";
    OutputArguments: string;
    Info: string;
  }[];
}

export class RunProcess extends Transformer {
  constructor() {
    super(
      UIPATH_ID,
      "Run a UiPath process",
      "Run a UiPath process using UiPath Cloud Orchestrator"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["uipath", "releaseKey"],
    properties: UIPATH_PROPERTIES,
  };

  /**
   * Additional permissions required for CORS
   */
  permissions: Permissions.Permissions = UIPATH_PERMISSIONS;

  async transform(
    {
      uipath,
      releaseKey,
      strategy = "JobsCount",
      jobsCount = 0,
      robotIds = [],
      awaitResult = false,
      inputArguments = {},
    }: BlockArg,
    { logger }: BlockOptions
  ): Promise<unknown> {
    const { data: startData } = await proxyService<JobsResponse>(uipath, {
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

    const start = new Date().getTime();

    if (awaitResult) {
      if (startData.value.length > 1) {
        throw new Error("Awaiting response of multiple jobs not supported");
      }
      do {
        const { data: resultData } = await proxyService<JobsResponse>(uipath, {
          url: `/odata/Jobs?$filter=Id eq ${startData.value[0].Id}`,
          method: "get",
        });

        if (resultData.value.length === 0) {
          logger.error(`UiPath job not found: ${startData.value[0].Id}`);
          throw new Error("UiPath job not found");
        }

        if (resultData.value[0].State === "Successful") {
          return JSON.parse(resultData.value[0].OutputArguments);
        } else if (resultData.value[0].State === "Faulted") {
          logger.error(`UiPath job failed: ${resultData.value[0].Info}`);
          throw new Error("UiPath job failed");
        }
        await sleep(POLL_MILLIS);
      } while (new Date().getTime() - start < MAX_WAIT_MILLIS);
      throw new Error(
        `UiPath job did not finish in ${MAX_WAIT_MILLIS / 1000} seconds`
      );
    }

    return {};
  }
}

registerBlock(new RunProcess());
