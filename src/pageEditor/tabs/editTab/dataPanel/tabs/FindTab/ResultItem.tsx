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

import React, { useLayoutEffect, useMemo } from "react";
import type { SetRequired } from "type-fest";
import type { FuseResult, FuseResultMatch, RangeTuple } from "fuse.js";
import {
  selectActiveModComponentId,
  selectActiveNodeId,
  selectGetModComponentFormStateByModComponentId,
} from "@/pageEditor/store/editor/editorSelectors";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { ListGroup } from "react-bootstrap";
import { createSelector } from "@reduxjs/toolkit";
import { memoize } from "lodash";
import { useSelector } from "react-redux";
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import cx from "classnames";
import { argmax } from "@/utils/arrayUtils";
import styles from "./ResultItem.module.scss";
import {
  type IndexedItem,
  isBrickCommentsItem,
  isBrickBreadcrumb,
  isFieldValueItem,
  isNodeBreadcrumb,
  isStarterBrickBreadcrumb,
  isBrickLabelItem,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/findTypes";
import {
  getBreadcrumbLabel,
  truncateBreadcrumbLabelsInPlace,
} from "@/pageEditor/tabs/editTab/dataPanel/tabs/FindTab/breadcrumbLabelHelpers";
import { fieldLabel } from "@/components/fields/fieldUtils";

type MatchData = {
  refIndex: number;
  item: IndexedItem;
  match: SetRequired<FuseResultMatch, "value">;
  breadcrumbLabels: string[];
};

const HighlightedMatch: React.VFC<{
  match: SetRequired<FuseResultMatch, "value">;
}> = ({ match: { indices, value } }) => {
  const markRef = React.createRef<HTMLSpanElement>();

  const bestIndex = argmax(
    indices,
    (rangeTuple: RangeTuple) => rangeTuple[1] - rangeTuple[0],
  );
  assertNotNullish(bestIndex, "Expected at least one match index");

  useLayoutEffect(() => {
    // Ensure the mark is visible in long content
    if (markRef.current) {
      markRef.current.scrollIntoView({
        inline: "center",
        behavior: "instant",
      });
    }
  }, [markRef]);

  const [start, end] = bestIndex;
  return (
    <div className={styles.match}>
      <span>{value.slice(0, start)}</span>
      <mark ref={markRef} className={styles.highlight}>
        {value.slice(start, end + 1)}
      </mark>
      <span>{value.slice(end + 1)}</span>
    </div>
  );
};

const selectGetMatchDataForResult = createSelector(
  selectGetModComponentFormStateByModComponentId,
  (getModComponentFormStateByModComponentId) =>
    memoize(({ item, matches, refIndex }: FuseResult<IndexedItem>) => {
      const { modComponentId, breadcrumbs } = item.location;

      const formState =
        getModComponentFormStateByModComponentId(modComponentId);
      assertNotNullish(formState, "Form State not found for mod");

      const match = matches?.[0] as Nullishable<
        SetRequired<FuseResultMatch, "value">
      >;
      assertNotNullish(match, "Expected at least one match");

      const common = {
        item,
        refIndex,
        match,
      } as const;

      if (isBrickCommentsItem(item)) {
        return {
          ...common,
          breadcrumbLabels: [
            formState.label,
            ...breadcrumbs.map((x) => getBreadcrumbLabel(x)),
          ],
        };
      }

      if (isFieldValueItem(item)) {
        const { prop, schema } = item.location.fieldRef;

        return {
          ...common,
          breadcrumbLabels: [
            formState.label,
            ...breadcrumbs.map((x) => getBreadcrumbLabel(x)),
            schema?.title ?? fieldLabel(prop),
          ],
        };
      }

      if (isBrickLabelItem(item)) {
        // eslint-disable-next-line unicorn/prefer-array-find -- target: es2023 in tsconfg.json not taking effect?
        const brickBreadcrumb = breadcrumbs
          .filter((x) => isBrickBreadcrumb(x))
          .at(-1);
        assertNotNullish(brickBreadcrumb, "Expected context for brick match");

        if (
          (match.key !== "data.label" && brickBreadcrumb.brickConfig.label) ||
          match.key === "data.brick.id"
        ) {
          return {
            ...common,
            breadcrumbLabels: [
              formState.label,
              ...breadcrumbs.map((x) => getBreadcrumbLabel(x)),
              "Brick",
            ],
          };
        }

        // Brick label match, or brick name match for bricks without a label
        return {
          ...common,
          breadcrumbLabels: [
            formState.label,
            ...breadcrumbs
              // Exclude the last brick in the stack from the path because that's the matched value
              .slice(0, -1)
              .map((x) => getBreadcrumbLabel(x)),
          ],
        };
      }

      throw new TypeError("Unexpected indexed item type");
    }),
);

export function useMatchData(
  results: Array<FuseResult<IndexedItem>>,
): MatchData[] {
  const getMatchDataForResult = useSelector(selectGetMatchDataForResult);

  return useMemo(() => {
    const matches = results.map((result) => getMatchDataForResult(result));
    truncateBreadcrumbLabelsInPlace(matches);
    return matches;
  }, [getMatchDataForResult, results]);
}

const ResultItem: React.VFC<{
  data: Pick<MatchData, "item" | "match" | "breadcrumbLabels">;
  onClick: () => void;
}> = ({ data: { match, breadcrumbLabels, item }, onClick }) => {
  const activeNodeId = useSelector(selectActiveNodeId);
  const activeModComponentId = useSelector(selectActiveModComponentId);

  // eslint-disable-next-line unicorn/prefer-array-find -- target: es2023 in tsconfg.json not taking effect?
  const lastNodeBreadcrumb = item.location.breadcrumbs
    .filter((x) => isNodeBreadcrumb(x))
    .at(-1);

  const isActiveNode =
    item.location.modComponentId === activeModComponentId &&
    ((isStarterBrickBreadcrumb(lastNodeBreadcrumb) &&
      activeNodeId === FOUNDATION_NODE_ID) ||
      (isBrickBreadcrumb(lastNodeBreadcrumb) &&
        activeNodeId === lastNodeBreadcrumb.brickConfig.instanceId));

  return (
    <ListGroup.Item
      onClick={onClick}
      aria-label={match.value}
      className={cx(styles.root, { [styles.activeNode ?? ""]: isActiveNode })}
    >
      <div>
        <HighlightedMatch match={match} />
      </div>
      <div className="small text-muted">{breadcrumbLabels.join(" > ")}</div>
    </ListGroup.Item>
  );
};

export default ResultItem;
