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
  type BrickContext,
  type IndexedItem,
  isBrickCommentsItem,
  isBrickContext,
  isFieldValueItem,
  isStarterBrickContext,
} from "@/pageEditor/find/searchIndexVisitor";
import React, { useMemo } from "react";
import type { SetRequired } from "type-fest";
import type { FuseResult, FuseResultMatch } from "fuse.js";
import {
  selectActiveModComponentId,
  selectActiveNodeId,
  selectGetModComponentFormStateByModComponentId,
} from "@/pageEditor/store/editor/editorSelectors";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { ListGroup } from "react-bootstrap";
import { createSelector } from "@reduxjs/toolkit";
import { groupBy, memoize, uniq } from "lodash";
import { useSelector } from "react-redux";
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import cx from "classnames";

import styles from "./ResultItem.module.scss";

function getLocationBrickLabel(brickContext: BrickContext): string {
  return (
    brickContext.brickConfig.label ??
    brickContext.brick?.name ??
    brickContext.brickConfig.id
  );
}

const HighlightedMatch: React.VFC<{
  match: SetRequired<FuseResultMatch, "value">;
}> = ({ match: { indices, value } }) => {
  let lastIndex = 0;

  const parts = [];

  for (const [start, end] of indices) {
    parts.push(
      <span>{value.slice(lastIndex, start)}</span>,
      <mark className={styles.highlight}>{value.slice(start, end + 1)}</mark>,
    );
    lastIndex = end + 1;
  }

  parts.push(<span>{value.slice(lastIndex)}</span>);

  return <div>{parts}</div>;
};

type MatchData = {
  refIndex: number;
  item: IndexedItem;
  match: SetRequired<FuseResultMatch, "value">;
  paths: string[];
};

const selectGetMatchDataForResult = createSelector(
  selectGetModComponentFormStateByModComponentId,
  (getModComponentFormStateByModComponentId) =>
    memoize(({ item, matches, refIndex }: FuseResult<IndexedItem>) => {
      const formState = getModComponentFormStateByModComponentId(
        item.location.modComponentId,
      );
      assertNotNullish(formState, "Form State not found for mod");

      const match = matches?.[0] as Nullishable<
        SetRequired<FuseResultMatch, "value">
      >;
      assertNotNullish(match, "Expected at least one match");

      const brickContexts = item.location.brickStack.filter((x) =>
        isBrickContext(x),
      );

      const common = {
        item,
        refIndex,
        match,
      } as const;

      if (isBrickCommentsItem(item)) {
        return {
          ...common,
          paths: [
            formState.label,
            ...brickContexts.map((x) => getLocationBrickLabel(x)),
          ],
        };
      }

      if (isFieldValueItem(item)) {
        const { prop, schema } = item.location.fieldRef;

        const firstContext = item.location.brickStack[0];

        if (isStarterBrickContext(firstContext)) {
          return {
            ...common,
            paths: [
              formState.label,
              firstContext.typeLabel,
              schema?.title ?? prop,
            ],
          };
        }

        return {
          ...common,
          paths: [
            formState.label,
            ...brickContexts.map((x) => getLocationBrickLabel(x)),
            schema?.title ?? prop,
          ],
        };
      }

      const brickContext = brickContexts.at(-1);
      assertNotNullish(brickContext, "Expected context for brick match");

      if (match.key !== "data.label" && brickContext.brickConfig.label) {
        return {
          ...common,
          paths: [
            formState.label,
            ...brickContexts.map((x) => getLocationBrickLabel(x)),
            "Brick",
          ],
        };
      }

      // Brick label match, or brick name match for bricks without a label
      return {
        ...common,
        paths: [
          formState.label,
          ...brickContexts
            // Exclude the last brick in the stack from the path because that's the matched value
            .slice(0, -1)
            .map((x) => getLocationBrickLabel(x)),
        ],
      };
    }),
);

/**
 * Truncate the middle of a string to a maximum length
 */
function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const half = Math.floor(maxLength / 2);
  return `${text.slice(0, half).trim()}...${text.slice(-half).trim()}`;
}

/**
 * Build truncation map where truncation preserves uniqueness
 */
function buildTruncationMap(
  segments: string[],
  initialMaxLength = 10,
): Map<string, string> {
  const result = new Map<string, string>();

  const uniqueSegments = uniq(segments);

  // Start with initial max length and relax constraint until all segments are unique
  for (
    let maxLength = initialMaxLength;
    maxLength < Math.max(...segments.map((x) => x.length));
    maxLength++
  ) {
    const remainingSegments = uniqueSegments.filter((x) => !result.has(x));
    for (const [truncated, sources] of Object.entries(
      groupBy(remainingSegments, (x) => truncateMiddle(x, maxLength)),
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
function truncatePathSegmentsInPlace(matches: MatchData[]): void {
  for (let i = 0; i < Math.max(...matches.map((x) => x.paths.length)); i++) {
    const truncationMap = buildTruncationMap(
      matches.map((x) => x.paths[i]).filter((x) => x != null),
    );

    for (const match of matches) {
      // Never truncate last segment, unless it's the first segment
      if (i === 0 || i < match.paths.length - 1) {
        // eslint-disable-next-line security/detect-object-injection, @typescript-eslint/no-non-null-assertion -- array index
        const currentPath = match.paths[i]!;

        // eslint-disable-next-line security/detect-object-injection -- array index
        match.paths[i] = truncationMap.get(currentPath) ?? currentPath;
      }
    }
  }
}

export function useMatchData(
  results: Array<FuseResult<IndexedItem>>,
): MatchData[] {
  const getMatchDataForResult = useSelector(selectGetMatchDataForResult);

  return useMemo(() => {
    const matches = results.map((result) => getMatchDataForResult(result));
    truncatePathSegmentsInPlace(matches);
    return matches;
  }, [getMatchDataForResult, results]);
}

const ResultItem: React.VFC<{
  data: Pick<MatchData, "item" | "match" | "paths">;
  onClick: () => void;
}> = ({ data: { match, paths, item }, onClick }) => {
  const activeNodeId = useSelector(selectActiveNodeId);
  const activeModComponentId = useSelector(selectActiveModComponentId);

  const context = item.location.brickStack.at(-1);

  const isActiveNode =
    item.location.modComponentId === activeModComponentId &&
    ((isStarterBrickContext(context) && activeNodeId === FOUNDATION_NODE_ID) ||
      (isBrickContext(context) &&
        activeNodeId === context.brickConfig.instanceId));

  return (
    <ListGroup.Item
      onClick={onClick}
      aria-label={match.value}
      className={cx(styles.root, { [styles.activeNode ?? ""]: isActiveNode })}
    >
      <div>
        <HighlightedMatch match={match} />
      </div>
      <div className="small">{paths.join(" > ")}</div>
    </ListGroup.Item>
  );
};

export default ResultItem;
