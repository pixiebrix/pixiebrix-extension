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

import blockRegistry from "@/blocks/registry";
import { reducePipeline } from "@/runtime/reducePipeline";
import {
  contextBlock,
  echoBlock,
  simpleInput,
  testOptions,
  throwBlock,
} from "./pipelineTestHelpers";
import { sendDeploymentAlert } from "@/background/messenger/api";
import { ApiVersion } from "@/core";
import { uuidv4 } from "@/types/helpers";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { serializeError } from "serialize-error";
import { ContextError } from "@/errors/genericErrors";

jest.mock("@/background/messenger/api", () => {
  const actual = jest.requireActual("@/background/messenger/api");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(echoBlock, contextBlock, throwBlock);
  (sendDeploymentAlert as any).mockReset();
});

describe.each([["v1"], ["v2"], ["v3"]])(
  "apiVersion: %s",
  (apiVersion: ApiVersion) => {
    test("do not alert without deployment id", async () => {
      await expect(async () => {
        await reducePipeline(
          {
            id: throwBlock.id,
            config: {
              message: "Example input",
            },
            onError: {
              alert: true,
            },
          },
          simpleInput({ inputArg: "hello" }),
          testOptions(apiVersion)
        );
      }).rejects.toThrow();

      // Not called because the run is not associated with a deployment id
      expect(sendDeploymentAlert).toHaveBeenCalledTimes(0);
    });

    test("send deployment alert", async () => {
      const deploymentId = uuidv4();

      const logger = new ConsoleLogger({ deploymentId });

      const pipeline = reducePipeline(
        {
          id: throwBlock.id,
          config: {
            message: "Example input",
          },
          onError: {
            alert: true,
          },
        },
        simpleInput({ inputArg: "hello" }),
        { ...testOptions(apiVersion), logger }
      );

      await expect(pipeline).rejects.toThrow(ContextError);

      const contextError = await pipeline.catch((error) => error);

      expect(sendDeploymentAlert).toHaveBeenCalledTimes(1);
      expect(sendDeploymentAlert).toBeCalledWith({
        deploymentId,
        data: {
          id: throwBlock.id,
          context: {
            "@input": {
              inputArg: "hello",
            },
            "@options": {},
          },
          error: serializeError((contextError as ContextError).cause),
        },
      });
    });
  }
);
