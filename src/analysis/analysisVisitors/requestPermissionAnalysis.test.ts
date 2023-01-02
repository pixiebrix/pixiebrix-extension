/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import RequestPermissionAnalysis from "@/analysis/analysisVisitors/requestPermissionAnalysis";
import {
  blockConfigFactory,
  triggerFormStateFactory,
} from "@/testUtils/factories";
import { RemoteMethod } from "@/blocks/transformers/remoteMethod";

browser.permissions.contains = jest.fn().mockResolvedValue(true);
const containsMock = browser.permissions.contains as jest.MockedFunction<
  typeof browser.permissions.contains
>;

describe("requestPermissionAnalysis", () => {
  beforeEach(() => {
    browser.permissions.contains = jest.fn().mockResolvedValue(true);
    containsMock.mockReset();
  });

  test("it annotates http: url", async () => {
    const visitor = new RequestPermissionAnalysis();
    const extension = triggerFormStateFactory();
    extension.extension.blockPipeline = [
      blockConfigFactory({
        id: RemoteMethod.BLOCK_ID,
        config: {
          url: {
            __type__: "nunjucks",
            __value__: "http://example.com",
          },
        },
      }),
    ];

    await visitor.run(extension);
    expect(visitor.getAnnotations()).toStrictEqual([
      {
        analysisId: "requestPermission",
        type: "warning",
        message:
          "PixieBrix does not support calls using http: because they are insecure. Please use https: instead.",
        position: {
          path: "extension.blockPipeline.0.config.url",
        },
      },
    ]);
  });

  test("it annotates insufficient permissions", async () => {
    const visitor = new RequestPermissionAnalysis();
    const extension = triggerFormStateFactory();
    extension.extension.blockPipeline = [
      blockConfigFactory({
        id: RemoteMethod.BLOCK_ID,
        config: {
          url: {
            __type__: "nunjucks",
            __value__: "https://example.com",
          },
        },
      }),
    ];

    browser.permissions.contains = jest.fn().mockResolvedValue(false);

    await visitor.run(extension);
    expect(visitor.getAnnotations()).toStrictEqual([
      {
        analysisId: "requestPermission",
        type: "error",
        message:
          "Insufficient browser permissions to make request. Specify an Integration to access the API, or add an Extra Permissions rule to the extension.",
        position: {
          path: "extension.blockPipeline.0.config.url",
        },
      },
    ]);
  });
});
