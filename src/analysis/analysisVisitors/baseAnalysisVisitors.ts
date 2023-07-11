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
import PipelineVisitor from "@/blocks/PipelineVisitor";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import blockRegistry, { type TypedBlockMap } from "@/blocks/registry";

/**
 * A base class for creating analysis visitors.
 */
export abstract class AnalysisVisitorABC
  extends PipelineVisitor
  implements Analysis
{
  abstract readonly id: string;

  protected extension: FormState;

  protected readonly annotations: AnalysisAnnotation[] = [];
  getAnnotations(): AnalysisAnnotation[] {
    return this.annotations;
  }

  /**
   * Visit the extension point definition.
   * @param extensionPoint
   */
  visitExtensionPoint(extensionPoint: FormState["extensionPoint"]): void {
    // NOP
  }

  run(extension: FormState): void {
    this.extension = extension;

    this.visitExtensionPoint(extension.extensionPoint);

    this.visitRootPipeline(extension.extension.blockPipeline, {
      extensionPointType: extension.type,
    });
  }
}

export abstract class AnalysisVisitorWithResolvedBricksABC extends AnalysisVisitorABC {
  protected allBlocks: TypedBlockMap;

  override async run(extension: FormState): Promise<void> {
    this.allBlocks = await blockRegistry.allTyped();

    super.run(extension);
  }
}
