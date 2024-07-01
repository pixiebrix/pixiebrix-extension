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

import RequestPermissionAnalysis from "@/analysis/analysisVisitors/requestPermissionAnalysis";
import { RemoteMethod } from "@/bricks/transformers/remoteMethod";
import { AnalysisAnnotationActionType } from "@/analysis/analysisTypes";
import { triggerFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import { toExpression } from "@/utils/expressionUtils";

browser.permissions.contains = jest.fn().mockResolvedValue(true);
const containsMock = jest.mocked(browser.permissions.contains);

function brickModComponentFactory(url: string) {
  const formState = triggerFormStateFactory();
  formState.modComponent.blockPipeline = [
    brickConfigFactory({
      id: RemoteMethod.BLOCK_ID,
      config: {
        url: toExpression("nunjucks", url),
      },
    }),
  ];

  return formState;
}

describe("requestPermissionAnalysis", () => {
  beforeEach(() => {
    containsMock.mockResolvedValue(true);
    containsMock.mockReset();
  });

  test("it annotates http: url", async () => {
    const visitor = new RequestPermissionAnalysis();
    const formState = brickModComponentFactory("http://example.com");

    await visitor.run(formState);
    expect(visitor.getAnnotations()).toStrictEqual([
      {
        analysisId: "requestPermission",
        type: "warning",
        message:
          "PixieBrix does not support calls using http: because they are insecure. Please use https: instead.",
        position: {
          path: "modComponent.blockPipeline.0.config.url",
        },
      },
    ]);
  });

  test("it annotates invalid url", async () => {
    const visitor = new RequestPermissionAnalysis();
    const formState = brickModComponentFactory(
      "https://there is a space in here",
    );

    await visitor.run(formState);
    expect(visitor.getAnnotations()).toStrictEqual([
      {
        analysisId: "requestPermission",
        type: "error",
        message: "Invalid URL: https://there is a space in here",
        position: {
          path: "modComponent.blockPipeline.0.config.url",
        },
      },
    ]);
  });

  test("it annotates insufficient permissions", async () => {
    const visitor = new RequestPermissionAnalysis();
    const formState = brickModComponentFactory("https://example.com");

    containsMock.mockResolvedValue(false);

    await visitor.run(formState);

    expect(containsMock).toHaveBeenCalledWith({
      // Checking that the visitor applies a trailing slash. `contains` requires a path on the URL
      origins: ["https://example.com/"],
    });

    expect(visitor.getAnnotations()).toStrictEqual([
      {
        actions: [
          expect.objectContaining({
            type: AnalysisAnnotationActionType.AddValueToArray,
          }),
        ],
        analysisId: "requestPermission",
        type: "error",
        message:
          "Insufficient browser permissions to make request. Specify an Integration to access the API, or add an Extra Permissions rule to the starter brick.",
        position: {
          path: "modComponent.blockPipeline.0.config.url",
        },
      },
    ]);
  });

  test("skip relative URLs", async () => {
    const visitor = new RequestPermissionAnalysis();
    const formState = brickModComponentFactory("/relative/url");

    await visitor.run(formState);

    expect(visitor.getAnnotations()).toHaveLength(0);
  });

  test("skips valid URLs", async () => {
    const visitor = new RequestPermissionAnalysis();
    containsMock.mockResolvedValue(true);
    const formState = brickModComponentFactory("https://example.com");

    await visitor.run(formState);

    expect(visitor.getAnnotations()).toHaveLength(0);
  });
});
