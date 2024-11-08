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

import { nestedPosition, type VisitBlockExtra } from "@/bricks/PipelineVisitor";
import { GetAPITransformer } from "@/bricks/transformers/httpGet";
import { RemoteMethod } from "@/bricks/transformers/remoteMethod";
import { type BrickConfig, type BrickPosition } from "@/bricks/types";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { AnalysisVisitorABC } from "./baseAnalysisVisitors";
import { getErrorMessage } from "@/errors/errorHelpers";
import { AnnotationType } from "@/types/annotationTypes";
import { AnalysisAnnotationActionType } from "@/analysis/analysisTypes";
import { ensurePermissionsFromUserGesture } from "@/permissions/permissionsUtils";
import {
  containsTemplateExpression,
  isTemplateExpression,
  isVarExpression,
} from "@/utils/expressionUtils";
import { allSettled } from "@/utils/promiseUtils";
import { isUrlRelative } from "@/utils/urlUtils";

/**
 * Checks permission for RemoteMethod and GetAPITransformer bricks to make a remote call
 */
class RequestPermissionAnalysis extends AnalysisVisitorABC {
  // XXX: for now we handle asynchronous pipeline traversal by gathering all the promises and awaiting them all
  // see discussion https://github.com/pixiebrix/pixiebrix-extension/pull/4013#discussion_r944690969
  private readonly permissionCheckPromises: Array<Promise<void>> = [];

  get id() {
    return "requestPermission";
  }

  override visitBrick(
    position: BrickPosition,
    blockConfig: BrickConfig,
    extra: VisitBlockExtra,
  ): void {
    super.visitBrick(position, blockConfig, extra);

    // Analyze the known blocks that make external HTTP request
    if (
      !(
        blockConfig.id === RemoteMethod.BRICK_ID ||
        blockConfig.id === GetAPITransformer.BRICK_ID
      ) ||
      blockConfig.config.service != null
    ) {
      return;
    }

    const requestUrl = blockConfig.config.url;
    // Only validating URLs that do not contain variables or other template strings
    if (
      isTemplateExpression(requestUrl) &&
      !isVarExpression(requestUrl) &&
      !containsTemplateExpression(requestUrl.__value__)
    ) {
      const url = requestUrl.__value__;

      if (isUrlRelative(url)) {
        // Don't attempt to validate relative URLs
        return;
      }

      let parsedURL: URL;

      try {
        parsedURL = new URL(url);
      } catch (error) {
        this.annotations.push({
          position: nestedPosition(position, "config.url"),
          // URL prefixes error message with "Invalid URL"
          message: getErrorMessage(error),
          analysisId: this.id,
          type: AnnotationType.Error,
        });

        return;
      }

      if (parsedURL.protocol !== "https:") {
        this.annotations.push({
          position: nestedPosition(position, "config.url"),
          message:
            "PixieBrix does not support calls using http: because they are insecure. Please use https: instead.",
          analysisId: this.id,
          type: AnnotationType.Warning,
        });

        return;
      }

      const permissionsValue = `${parsedURL.origin}/*`;

      this.permissionCheckPromises.push(
        (async () => {
          const hasPermissions = await browser.permissions.contains({
            origins: [parsedURL.href],
          });
          if (!hasPermissions) {
            this.annotations.push({
              position: nestedPosition(position, "config.url"),
              message:
                "Insufficient browser permissions to make request. Specify an Integration to access the API, or add an Extra Permissions rule to the starter brick.",
              analysisId: this.id,
              type: AnnotationType.Error,
              actions: [
                {
                  caption: "Add Extra Permission",
                  type: AnalysisAnnotationActionType.AddValueToArray,
                  path: "permissions.origins",
                  value: permissionsValue,
                  async extraCallback() {
                    await ensurePermissionsFromUserGesture({
                      origins: [permissionsValue],
                    });
                  },
                },
              ],
            });
          }
        })(),
      );
    }
  }

  override async run(formState: ModComponentFormState): Promise<void> {
    super.run(formState);

    // Use allSettled because `browser.permissions.contains` errors out for certain cases, e.g., malformed URLs
    await allSettled(this.permissionCheckPromises, {
      catch: "ignore",
    });
  }
}

export default RequestPermissionAnalysis;
