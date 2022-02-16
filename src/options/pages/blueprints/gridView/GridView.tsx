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

import styles from "./GridView.module.scss";

import React, { useMemo } from "react";
import { BlueprintListViewProps } from "@/options/pages/blueprints/blueprintsTypes";
import { FixedSizeGrid as Grid } from "react-window";
import { getUniqueId } from "@/options/pages/blueprints/installableUtils";
import GridCard from "./GridCard";
import ListGroupHeader from "@/options/pages/blueprints/listView/ListGroupHeader";
import ListItem from "@/options/pages/blueprints/listView/ListItem";
import { expandRows } from "@/options/pages/blueprints/listView/ListView";

const GridView: React.VoidFunctionComponent<BlueprintListViewProps> = ({
  tableInstance,
  rows,
  width,
  height,
}) => {
  // TODO: move expandedRows up a level
  const expandedRows = useMemo(() => expandRows(rows), [rows]);

  return (
    <div className={styles.root}>
      <Grid
        height={height}
        width={width}
        rowHeight={200}
        rowCount={rows.length}
        columnCount={1}
        columnWidth={200}
      >
        {({ rowIndex, style }) => {
          const row = rows[rowIndex];
          tableInstance.prepareRow(row);

          return <GridCard installableItem={row.original} style={style} />;
        }}
      </Grid>
    </div>
  );
};

export default GridView;
