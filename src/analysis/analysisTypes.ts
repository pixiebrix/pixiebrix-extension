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

import { UUID } from "@/core";
import { UnknownObject } from "@/types";

/**
 * Defines the position of the block in the extension
 */
export type AbsolutePosition = {
  /**
   * The path to the block relative to the root pipeline
   */
  path: string;
};

export enum AnnotationType {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

export type Annotation = {
  /**
   * Position of the annotation within the extension configuration
   */
  position: AbsolutePosition;
  /**
   * A user-readable message for the annotation
   */
  message: string;
  /**
   * Unique identifier for analysis that created this annotation
   */
  analysisId: string;
  /**
   * The type of annotation
   */
  type: AnnotationType;
  /**
   * Custom data produced by the analysis
   */
  detail?: UnknownObject;
};

export interface Analysis {
  /**
   * Unique identifier for this analysis
   */
  readonly id: string;

  /**
   * Return the produced annotations.
   */
  getAnnotations(): Annotation[];
}

export type AnalysisState = {
  extensionAnnotations: Record<UUID, Annotation[]>;
};

export type AnalysisRootState = {
  analysis: AnalysisState;
};
