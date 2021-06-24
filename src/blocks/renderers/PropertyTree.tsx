/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { TreeTable } from "primereact/treetable";
import { Column } from "primereact/column";
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const theme = require("!!raw-loader!primereact/resources/themes/saga-blue/theme.css?esModule=false")
  .default;

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const primereact = require("!!raw-loader!primereact/resources/primereact.min.css?esModule=false")
  .default;

// FIXME: figure out how to load the fonts, since the font URL in the file doesn't work with Chrome extensions
// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const primeicons = require("!!raw-loader!primeicons/primeicons.css?esModule=false")
  .default;

const PropertyTree: React.FunctionComponent<{ value: any }> = ({ value }) => {
  return (
    <React.Fragment>
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: theme.toString() }}
      />
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: primereact.toString() }}
      />
      <style
        type="text/css"
        dangerouslySetInnerHTML={{ __html: primeicons.toString() }}
      />
      <TreeTable value={value}>
        <Column field="name" header="Property" expander />
        <Column field="value" header="Value" />
      </TreeTable>
    </React.Fragment>
  );
};

export default PropertyTree;
