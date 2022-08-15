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

import { TreeTable } from "primereact/treetable";
import { Column } from "primereact/column";
import { Stylesheet } from "@/components/Stylesheet";
import React from "react";

import theme from "primereact/resources/themes/saga-blue/theme.css?loadAsUrl";
import primereact from "primereact/resources/primereact.min.css?loadAsUrl";
import primeicons from "primeicons/primeicons.css?loadAsUrl";

const PropertyTree: React.FunctionComponent<{ value: any }> = ({ value }) => (
  <React.Fragment>
    <Stylesheet href={[theme, primereact, primeicons]}>
      <TreeTable value={value}>
        <Column field="name" header="Property" expander />
        <Column field="value" header="Value" />
      </TreeTable>
    </Stylesheet>
  </React.Fragment>
);

export default PropertyTree;
