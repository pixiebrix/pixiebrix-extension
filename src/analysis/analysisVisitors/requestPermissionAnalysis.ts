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

import { AnnotationType } from "@/analysis/analysisTypes";
import { nestedPosition, VisitBlockExtra } from "@/blocks/PipelineVisitor";
import { GetAPITransformer } from "@/blocks/transformers/httpGet";
import { RemoteMethod } from "@/blocks/transformers/remoteMethod";
import { BlockConfig, BlockPosition } from "@/blocks/types";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { isTemplateString } from "@/pageEditor/extensionPoints/upgrade";
import { isTemplateExpression, isVarExpression } from "@/runtime/mapArgs";
import { AnalysisVisitor } from "./baseAnalysisVisitors";

/**
 * Checks permission for RemoteMethod and GetAPITransformer bricks to make a remote call
 */
class RequestPermissionAnalysis extends AnalysisVisitor {
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
      const permissionCheckPromise = browser.permissions
        .contains({
          origins: [requestUrl.__value__],
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

    await Promise.all(this.permissionCheckPromises);
  }
}

export default RequestPermissionAnalysis;
