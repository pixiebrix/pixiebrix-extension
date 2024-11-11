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

import { type BrickPosition } from "@/bricks/types";
import { type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import HttpRequestAnalysis from "@/analysis/analysisVisitors/httpRequestAnalysis";
import { RemoteMethod } from "@/bricks/transformers/remoteMethod";
import { AnnotationType } from "@/types/annotationTypes";

import { toExpression } from "@/utils/expressionUtils";

const position: BrickPosition = {
  path: "test.path",
};

describe("httpRequestAnalysis", () => {
  test("flags URL parameters as info", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "get",
          url: "https://example.com/?foo=42",
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Info,
        message:
          "Pro-tip: you can pass URL parameters to the Search Parameters field. When using the Search Parameters field, PixieBrix automatically encodes parameter values.",
        position: {
          path: "test.path.config.url",
        },
      }),
    ]);
  });

  test("ignores URL with template", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "get",
          url: toExpression("nunjucks", "https://example.com/?foo={{ @foo }}"),
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([]);
  });

  test("flags passing params as data", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "get",
          url: "https://example.com",
          data: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
        message:
          "Watch Out: APIs typically expect GET request input via URL Search Parameters instead of JSON data.",
        position: {
          path: "test.path.config.data",
        },
      }),
    ]);
  });

  test("passing string data", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "post",
          url: "https://example.com",
          data: toExpression(
            "nunjucks",
            JSON.stringify({
              foo: 42,
            }),
          ),
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
        message:
          "Watch Out! You are passing the data as text instead of as an object",
        position: {
          path: "test.path.config.data",
        },
      }),
    ]);
  });

  test("ignores data with template", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "post",
          url: "https://example.com",
          data: toExpression(
            "nunjucks",
            JSON.stringify({
              foo: "{{ @foo }}",
            }),
          ),
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([]);
  });

  test("passing data for get", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "get",
          url: "https://example.com",
          data: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([
      expect.objectContaining({
        type: AnnotationType.Warning,
        message:
          "Watch Out: APIs typically expect GET request input via URL Search Parameters instead of JSON data.",
        position: {
          path: "test.path.config.data",
        },
      }),
    ]);
  });

  test("valid get request", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "get",
          url: "https://example.com",
          params: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([]);
  });

  test("valid post request", () => {
    const analysis = new HttpRequestAnalysis();
    analysis.visitBrick(
      position,
      {
        id: RemoteMethod.BRICK_ID,
        config: {
          method: "post",
          url: "https://example.com",
          data: {
            foo: 42,
          },
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toStrictEqual([]);
  });
});
