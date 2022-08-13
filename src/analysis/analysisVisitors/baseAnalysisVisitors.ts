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

import { Analysis, Annotation } from "@/analysis/analysisTypes";
import PipelineVisitor from "@/blocks/PipelineVisitor";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import blockRegistry, { TypedBlockMap } from "@/blocks/registry";

/**
 * A base class for creating analysis visitors.
 */
export abstract class AnalysisVisitor
  extends PipelineVisitor
  implements Analysis
{
  abstract readonly id: string;

  protected readonly annotations: Annotation[] = [];
  getAnnotations(): Annotation[] {
    return this.annotations;
  }

  run(extension: FormState): void | Promise<void> {
    this.visitRootPipeline(extension.extension.blockPipeline, {
      extensionPointType: extension.type,
    });
  }
}

export abstract class AnalysisVisitorWithResolvedBlocks extends AnalysisVisitor {
  protected allBlocks: TypedBlockMap;

  override async run(extension: FormState): Promise<void> {
    this.allBlocks = await blockRegistry.allTyped();

    await super.run(extension);
  }
}
