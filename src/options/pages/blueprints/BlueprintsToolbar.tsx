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

import styles from "@/options/pages/blueprints/BlueprintsCard.module.scss";
import Select from "react-select";
import { Button, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faSortAmountDownAlt,
  faSortAmountUpAlt,
  faThLarge,
} from "@fortawesome/free-solid-svg-icons";
import React, { useMemo } from "react";
import { TableInstance } from "react-table";
import useReduxState from "@/hooks/useReduxState";
import {
  selectFilters,
  selectGroupBy,
  selectSortBy,
  selectView,
} from "@/options/pages/blueprints/blueprintsSelectors";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import { useSelector } from "react-redux";

const BlueprintsToolbar: React.FunctionComponent<{
  tableInstance: TableInstance;
}> = ({ tableInstance }) => {
  const {
    flatHeaders,
    flatRows,
    rows,
    state: { globalFilter },
  } = tableInstance;

  const [view, setView] = useReduxState(
    selectView,
    blueprintsSlice.actions.setView
  );

  const [groupBy, setGroupBy] = useReduxState(
    selectGroupBy,
    blueprintsSlice.actions.setGroupBy
  );

  const [sortBy, setSortBy] = useReduxState(
    selectSortBy,
    blueprintsSlice.actions.setSortBy
  );

  const filters = useSelector(selectFilters);

  const isGrouped = groupBy.length > 0;

  const isSorted = sortBy.length > 0;
  const numberOfBlueprints = isGrouped
    ? flatRows.length - rows.length
    : rows.length;

  const { groupByOptions, sortByOptions } = useMemo(() => {
    const groupByOptions = flatHeaders
      .filter((column) => column.canGroupBy)
      .map((column) => ({
        label: column.Header,
        value: column.id,
      }));

    const sortByOptions = flatHeaders
      .filter((column) => column.canSort)
      .map((column) => ({
        label: column.Header,
        value: column.id,
      }));

    return { groupByOptions, sortByOptions };
  }, [flatHeaders]);

  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h3 className={styles.filterTitle}>
        {globalFilter
          ? `${numberOfBlueprints} results for "${globalFilter}"`
          : `${filters.length > 0 ? filters[0].value : "All"} Blueprints`}
      </h3>
      <span className="d-flex align-items-center small">
        <span className="ml-3 mr-2">Group by:</span>
        <Select
          isClearable
          placeholder="Group by"
          options={groupByOptions}
          onChange={(option, { action }) => {
            const value = action === "clear" ? [] : [option.value];
            setGroupBy(value);
          }}
          value={groupByOptions.find((opt) => opt.value === groupBy[0])}
        />

        <span className="ml-3 mr-2">Sort by:</span>
        <Select
          isClearable
          placeholder="Sort by"
          options={sortByOptions}
          onChange={(option, { action }) => {
            const value =
              action === "clear" ? [] : [{ id: option.value, desc: false }];
            setSortBy(value);
          }}
          value={sortByOptions.find((opt) => opt.value === sortBy[0]?.id)}
        />

        {isSorted && (
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              const value = [{ id: sortBy[0].id, desc: !sortBy[0].desc }];
              setSortBy(value);
            }}
          >
            <FontAwesomeIcon
              icon={
                sortBy[0].id === "updatedAt"
                  ? sortBy[0].desc
                    ? faSortAmountDownAlt
                    : faSortAmountUpAlt
                  : sortBy[0].desc
                  ? faSortAmountUpAlt
                  : faSortAmountDownAlt
              }
              size="lg"
            />
          </Button>
        )}

        <ButtonGroup>
          <Button
            variant={view === "list" ? "info" : "outline-info"}
            size="sm"
            className="ml-3"
            onClick={() => {
              setView("list");
            }}
          >
            <FontAwesomeIcon icon={faList} size="1x" />
          </Button>
          <Button
            variant={view === "grid" ? "info" : "outline-info"}
            size="sm"
            onClick={() => {
              setView("grid");
            }}
          >
            <FontAwesomeIcon icon={faThLarge} size="1x" />
          </Button>
        </ButtonGroup>
      </span>
    </div>
  );
};

export default BlueprintsToolbar;
