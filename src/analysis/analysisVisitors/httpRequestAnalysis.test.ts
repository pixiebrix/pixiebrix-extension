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

import { type BrickPosition } from "@/bricks/types";
import { type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import HttpRequestAnalysis from "@/analysis/analysisVisitors/httpRequestAnalysis";
import { RemoteMethod } from "@/bricks/transformers/remoteMethod";
import { AnnotationType } from "@/types/annotationTypes";
import { makeTemplateExpression } from "@/runtime/expressionCreators";

const position: BrickPosition = {
  path: "test.path",
};

describe("RegexAnalysis", () => {
  test("flags URL parameters as info", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BLOCK_ID,
        config: {
          method: "get",
          url: "https://example.com/?foo=42",
        },
      },
      {} as VisitBlockExtra
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Info,
      }),
    ]);
  });

  test("flags passing params as data", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BLOCK_ID,
        config: {
          method: "get",
          url: "https://example.com",
          data: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
      }),
    ]);
  });

  test("passing string data", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BLOCK_ID,
        config: {
          method: "post",
          url: "https://example.com",
          data: makeTemplateExpression(
            "nunjucks",
            JSON.stringify({
              foo: 42,
            })
          ),
        },
      },
      {} as VisitBlockExtra
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
      }),
    ]);
  });

  test("passing data for get", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BLOCK_ID,
        config: {
          method: "get",
          url: "https://example.com",
          data: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
      }),
    ]);
  });

  test("valid get request", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BLOCK_ID,
        config: {
          method: "get",
          url: "https://example.com",
          params: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra
    );

    expect(analysis.getAnnotations()).toStrictEqual([]);
  });

  test("valid post request", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BLOCK_ID,
        config: {
          method: "post",
          url: "https://example.com",
          data: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra
    );

    expect(analysis.getAnnotations()).toStrictEqual([]);
  });
});
