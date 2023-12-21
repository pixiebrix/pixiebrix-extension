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

import {
  type Analysis,
  type AnalysisAnnotation,
} from "@/analysis/analysisTypes";
import PipelineVisitor from "@/bricks/PipelineVisitor";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import blockRegistry, { type TypedBrickMap } from "@/bricks/registry";

/**
 * A base class for creating analysis visitors.
 */
export abstract class AnalysisVisitorABC
  extends PipelineVisitor
  implements Analysis
{
  abstract readonly id: string;

  protected extension: ModComponentFormState;

  protected readonly annotations: AnalysisAnnotation[] = [];
  getAnnotations(): AnalysisAnnotation[] {
    return this.annotations;
  }

  /**
   * Visit the extension point definition.
   * @param extensionPoint
   */
  visitExtensionPoint(
    extensionPoint: ModComponentFormState["extensionPoint"],
  ): void {
    // NOP
  }

  run(extension: ModComponentFormState): void {
    this.extension = extension;

    this.visitExtensionPoint(extension.extensionPoint);

    this.visitRootPipeline(extension.extension.blockPipeline, {
      extensionPointType: extension.type,
    });
  }
}

export abstract class AnalysisVisitorWithResolvedBricksABC extends AnalysisVisitorABC {
  protected allBlocks: TypedBrickMap;

  override async run(extension: ModComponentFormState): Promise<void> {
    this.allBlocks = await blockRegistry.allTyped();

    super.run(extension);
  }
}
