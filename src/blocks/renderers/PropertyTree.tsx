/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { TreeTable } from "primereact/treetable";
import { Column } from "primereact/column";
import React from "react";

const theme = new URL("primereact/resources/themes/saga-blue/theme.css").href;
const primereact = new URL("primereact/resources/primereact.min.css").href;

// FIXME: figure out how to load the fonts, since the font URL in the file doesn't
//  work with Chrome extensions. Likely webpack needs to use css-loader to properly
//  parse all the url() inside it.
const primeicons = new URL("primeicons/primeicons.css").href;

const PropertyTree: React.FunctionComponent<{ value: any }> = ({ value }) => (
  <React.Fragment>
    <link rel="stylesheet" href={theme} />
    <link rel="stylesheet" href={primereact} />
    <link rel="stylesheet" href={primeicons} />
    <TreeTable value={value}>
      <Column field="name" header="Property" expander />
      <Column field="value" header="Value" />
    </TreeTable>
  </React.Fragment>
);

export default PropertyTree;
