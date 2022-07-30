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
import { AnalysisRootState, Annotation } from "./analysisTypes";

// Serves to avoid creating new arrays and ensure reference equality for empty annotations
const emptyAnnotations = Object.freeze([]) as Annotation[];

export function selectExtensionAnnotations(
  extensionId: UUID
): (state: AnalysisRootState) => Annotation[] {
  return ({ analysis }: AnalysisRootState) =>
    // eslint-disable-next-line security/detect-object-injection -- extensionId is supposed to be UUID, not from user input
    analysis.extensionAnnotations[extensionId] ?? emptyAnnotations;
}
