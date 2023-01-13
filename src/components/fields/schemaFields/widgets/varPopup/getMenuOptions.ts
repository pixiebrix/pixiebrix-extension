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

import { KnownSources } from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import type VarMap from "@/analysis/analysisVisitors/varAnalysis/varMap";
import { isEmpty, merge } from "lodash";
import { type JsonObject } from "type-fest";

function getMenuOptions(knownVars: VarMap, contextValues: JsonObject) {
  const varMap = knownVars.getMap();

  // We don't show traces as a separate source
  delete varMap[KnownSources.TRACE];

  if (isEmpty(contextValues)) {
    return Object.entries(varMap);
  }

  const varMapEntries = Object.entries(varMap);
  const visitedOutputs = new Set<string>();

  // Merging the context values into the varMapEntries
  // We do this in reverse order so that the most recent block gets the values
  // This is important for the case where the same output key is used multiple times in a pipeline
  for (let index = varMapEntries.length - 1; index >= 0; index--) {
    // eslint-disable-next-line security/detect-object-injection -- accessing array item by index
    const [, existenceMap] = varMapEntries[index];

    for (const [outputKey] of Object.entries(existenceMap)) {
      // eslint-disable-next-line security/detect-object-injection -- access via object key
      if (contextValues[outputKey] != null && !visitedOutputs.has(outputKey)) {
        // eslint-disable-next-line security/detect-object-injection -- access via object key
        merge(existenceMap[outputKey], contextValues[outputKey]);
        visitedOutputs.add(outputKey);
      }
    }
  }

  return varMapEntries;
}

export default getMenuOptions;
