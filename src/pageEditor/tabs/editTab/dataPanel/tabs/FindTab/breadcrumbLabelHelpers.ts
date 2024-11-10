/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
  isBrickBreadcrumb,
  isDocumentBuilderElementBreadcrumb,
  isStarterBrickBreadcrumb,
  type ItemBreadcrumb,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/findTypes";
import { groupBy, uniq } from "lodash";
import { truncateMiddle } from "@/utils/stringUtils";
import documentBuilderElementTypeLabels from "@/pageEditor/documentBuilder/elementTypeLabels";

/**
 * Returns the human-readable label for a breadcrumb.
 */
export function getBreadcrumbLabel(breadcrumb: ItemBreadcrumb): string {
  if (isBrickBreadcrumb(breadcrumb)) {
    return (
      breadcrumb.brickConfig.label ??
      breadcrumb.brick?.name ??
      breadcrumb.brickConfig.id
    );
  }

  if (isStarterBrickBreadcrumb(breadcrumb)) {
    return breadcrumb.typeLabel;
  }

  if (isDocumentBuilderElementBreadcrumb(breadcrumb)) {
    return documentBuilderElementTypeLabels[breadcrumb.builderElement.type];
  }

  throw new TypeError("Unexpected breadcrumb type");
}

/**
 * Build truncation map that ensures truncation preserves uniqueness
 * @returns Map from original breadcrumb label to the truncated label
 */
function buildTruncationMap(
  labels: string[],
  initialMaxLength = 10,
): Map<string, string> {
  const result = new Map<string, string>();

  const uniqueLabels = uniq(labels);

  // Start with initial max length and relax constraint until all segments are unique
  for (
    let maxLength = initialMaxLength;
    maxLength < Math.max(...labels.map((x) => x.length));
    maxLength++
  ) {
    const remainingLabels = uniqueLabels.filter((x) => !result.has(x));
    for (const [truncated, sources] of Object.entries(
      groupBy(remainingLabels, (x) => truncateMiddle(x, { length: maxLength })),
    )) {
      // Truncation yielded unique value
      if (sources.length === 1) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check
        result.set(sources[0]!, truncated);
      }
    }
  }

  return result;
}

/**
 * Truncate path segments in place. Mutates the input array.
 */
export function truncateBreadcrumbLabelsInPlace(
  matches: Array<{ breadcrumbLabels: string[] }>,
): void {
  for (
    let i = 0;
    i < Math.max(...matches.map((x) => x.breadcrumbLabels.length));
    i++
  ) {
    const truncationMap = buildTruncationMap(
      // eslint-disable-next-line security/detect-object-injection -- array index
      matches.map((x) => x.breadcrumbLabels[i]).filter((x) => x != null),
    );

    for (const match of matches) {
      // Never truncate last segment, unless it's the first segment
      if (i === 0 || i < match.breadcrumbLabels.length - 1) {
        // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-non-null-assertion -- array index
        const currentPath = match.breadcrumbLabels[i]!;

        // eslint-disable-next-line security/detect-object-injection -- array index
        match.breadcrumbLabels[i] =
          truncationMap.get(currentPath) ?? currentPath;
      }
    }
  }
}
