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

import { AnnotationType } from "@/analysis/analysisTypes";
import { nestedPosition, type VisitBlockExtra } from "@/blocks/PipelineVisitor";
import { GetAPITransformer } from "@/blocks/transformers/httpGet";
import { RemoteMethod } from "@/blocks/transformers/remoteMethod";
import { type BlockConfig, type BlockPosition } from "@/blocks/types";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { isTemplateString } from "@/pageEditor/extensionPoints/upgrade";
import { isTemplateExpression, isVarExpression } from "@/runtime/mapArgs";
import { AnalysisVisitor } from "./baseAnalysisVisitors";
import { isAbsoluteUrl } from "@/utils";
import { getErrorMessage } from "@/errors/errorHelpers";

/**
 * Checks permission for RemoteMethod and GetAPITransformer bricks to make a remote call
 */
class RequestPermissionAnalysis extends AnalysisVisitor {
  // XXX: for now we handle asynchronous pipeline traversal by gathering all the promises and awaiting them all
  // see discussion https://github.com/pixiebrix/pixiebrix-extension/pull/4013#discussion_r944690969
  private readonly permissionCheckPromises: Array<Promise<void>> = [];

  get id() {
    return "requestPermission";
  }

  override visitBlock(
    position: BlockPosition,
    blockConfig: BlockConfig,
    extra: VisitBlockExtra
  ): void {
    super.visitBlock(position, blockConfig, extra);

    // Analyze the known blocks that make external HTTP request
    if (
      !(
        blockConfig.id === RemoteMethod.BLOCK_ID ||
        blockConfig.id === GetAPITransformer.BLOCK_ID
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
      !isTemplateString(requestUrl.__value__)
    ) {
      const url = requestUrl.__value__;

      if (!isAbsoluteUrl(url)) {
        return;
      }

      if (url.startsWith("http://")) {
        this.annotations.push({
          position: nestedPosition(position, "config.url"),
          message:
            "PixieBrix does not support calls using http: because they are insecure. Please use https: instead.",
          analysisId: this.id,
          type: AnnotationType.Warning,
        });

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
          type: AnnotationType.Warning,
        });

        return;
      }

      const permissionCheckPromise = browser.permissions
        .contains({
          origins: [parsedURL.href],
        })
        // eslint-disable-next-line promise/prefer-await-to-then -- need the complete Promise
        .then((hasPermission) => {
          if (!hasPermission) {
            this.annotations.push({
              position: nestedPosition(position, "config.url"),
              message:
                "Insufficient browser permissions to make request. Specify an Integration to access the API, or add an Extra Permissions rule to the extension.",
              analysisId: this.id,
              type: AnnotationType.Error,
            });
          }
        });

      this.permissionCheckPromises.push(permissionCheckPromise);
    }
  }

  override async run(extension: FormState): Promise<void> {
    super.run(extension);

    // Use allSettled because `browser.permissions.contains` errors out for certain cases, e.g., malformed URLs
    await Promise.allSettled(this.permissionCheckPromises);
  }
}

export default RequestPermissionAnalysis;
