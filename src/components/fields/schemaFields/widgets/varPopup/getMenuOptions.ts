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
import { setWith } from 'lodash';

function getMenuOptions(knownVars: VarMap) {
  const varMap = knownVars.getMap();
  const traceVars = varMap[KnownSources.TRACE];
  if (traceVars === undefined) {
    return Object.entries(varMap);
  }

  delete varMap[KnownSources.TRACE];

  const varMapEntries = Object.entries(varMap);

  // TODO mark the visited items (shadowed items issue)
 for (const [source, existenceMap] of varMapEntries.reverse()) {
   for (const [outputKey, map] of Object.entries(existenceMap)) {

    if (traceVars[outputKey] !== undefined) {
      setWith()
    }
   }

   }
 }

  return varMapEntries;
}

export default getMenuOptions;
