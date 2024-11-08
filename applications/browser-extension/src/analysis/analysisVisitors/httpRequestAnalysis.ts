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

import { AnalysisVisitorABC } from "./baseAnalysisVisitors";
import { type BrickConfig, type BrickPosition } from "../../bricks/types";
import { type VisitBlockExtra } from "../../bricks/PipelineVisitor";
import { AnnotationType } from "../../types/annotationTypes";
import { castTextLiteralOrThrow } from "../../utils/expressionUtils";
import { RemoteMethod } from "../../bricks/transformers/remoteMethod";
import { isEmpty } from "lodash";
import { type JsonValue } from "type-fest";
import { joinPathParts } from "../../utils/formUtils";

function tryParse(value: unknown): JsonValue {
  if (typeof value === "string") {
    try {
      // If payload is JSON, parse it for easier reading
      return JSON.parse(value);
    } catch {
      // NOP
    }
  }

  return null;
}

/**
 * Visitor to detect common mistakes when using the HTTP Request brick.
 */
class HttpRequestAnalysis extends AnalysisVisitorABC {
  get id() {
    return "http";
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ) {
    super.visitBrick(position, blockConfig, extra);

    if (blockConfig.id !== RemoteMethod.BRICK_ID) {
      return;
    }

    const { method, data, params, url } = blockConfig.config;

    let urlLiteral;
    let dataLiteral;
    let methodLiteral;

    try {
      const castUrl = castTextLiteralOrThrow(url);
      if (castUrl) {
        urlLiteral = new URL(castUrl);
      }
    } catch {
      // NOP
    }

    try {
      methodLiteral = castTextLiteralOrThrow(method);
    } catch {
      // NOP
    }

    try {
      dataLiteral = tryParse(castTextLiteralOrThrow(data));
    } catch {
      // NOP
    }

    if (methodLiteral === "get" && !isEmpty(data) && isEmpty(params)) {
      this.annotations.push({
        position: {
          path: joinPathParts(position.path, "config", "data"),
        },
        message:
          "Watch Out: APIs typically expect GET request input via URL Search Parameters instead of JSON data.",
        analysisId: this.id,
        type: AnnotationType.Warning,
      });
    }

    // URLSearchParams returns a symbol in the iterator
    if (
      methodLiteral === "get" &&
      isEmpty(params) &&
      urlLiteral &&
      [...urlLiteral.searchParams.keys()].length > 0
    ) {
      this.annotations.push({
        position: {
          path: joinPathParts(position.path, "config", "url"),
        },
        message:
          "Pro-tip: you can pass URL parameters to the Search Parameters field. When using the Search Parameters field, PixieBrix automatically encodes parameter values.",
        analysisId: this.id,
        type: AnnotationType.Info,
      });
    }

    if (dataLiteral) {
      this.annotations.push({
        position: {
          path: joinPathParts(position.path, "config", "data"),
        },
        message:
          "Watch Out! You are passing the data as text instead of as an object",
        analysisId: this.id,
        type: AnnotationType.Warning,
      });
    }

    if (
      !["get", "delete", "options"].includes(methodLiteral ?? "") &&
      isEmpty(data) &&
      !isEmpty(params)
    ) {
      this.annotations.push({
        position: {
          path: joinPathParts(position.path, "config", "params"),
        },
        message: `Watch Out! APIs typically expect input to be passed via data payload instead of URL query parameters for ${methodLiteral} requests`,
        analysisId: this.id,
        type: AnnotationType.Warning,
      });
    }
  }
}

export default HttpRequestAnalysis;
