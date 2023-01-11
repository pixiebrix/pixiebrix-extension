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
import { type TraceRecord } from "@/telemetry/trace";
import { isEmpty, mapValues, set } from "lodash";

function getMenuOptions(knownVars: VarMap, trace: TraceRecord) {
  const varMap = knownVars.getMap();

  if (isEmpty(trace?.templateContext)) {
    return Object.entries(mapValues(varMap, setEmptyValues));
  }

  delete varMap[KnownSources.TRACE];

  const varMapEntries = Object.entries(varMap);
  const visitedOutputs = new Set<string>();
  for (let index = varMapEntries.length - 1; index >= 0; index--) {
    const [, existenceMap] = varMapEntries[index];

    for (const [outputKey] of Object.entries(existenceMap)) {
      if (
        trace.templateContext[outputKey] != null &&
        !visitedOutputs.has(outputKey)
      ) {
        set(existenceMap, outputKey, trace.templateContext[outputKey]);
        visitedOutputs.add(outputKey);
      }
    }

    varMapEntries[index][1] = setEmptyValues(existenceMap);
  }

  return varMapEntries;
}

function setEmptyValues(existenceMap: any): any {
  return existenceMap;

  if (isEmpty(existenceMap)) {
    return "not set";
  }

  if (typeof existenceMap !== "object") {
    return existenceMap;
  }

  return mapValues(existenceMap, setEmptyValues);
}

export default getMenuOptions;
