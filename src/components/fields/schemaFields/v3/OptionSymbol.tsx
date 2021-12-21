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

import React from "react";
import VariableSymbol from "./optionSymbols/var.svg?loadAsComponent";
import ArraySymbol from "./optionSymbols/array.svg?loadAsComponent";
import ObjectSymbol from "./optionSymbols/object.svg?loadAsComponent";
import ToggleSymbol from "./optionSymbols/toggle.svg?loadAsComponent";
import SelectSymbol from "./optionSymbols/select.svg?loadAsComponent";
import TextSymbol from "./optionSymbols/text.svg?loadAsComponent";
import NumberSymbol from "./optionSymbols/number.svg?loadAsComponent";
import ExcludeSymbol from "./optionSymbols/exclude.svg?loadAsComponent";
import styles from "./OptionSymbol.module.scss";

const components = {
  variable: VariableSymbol,
  array: ArraySymbol,
  object: ObjectSymbol,
  toggle: ToggleSymbol,
  select: SelectSymbol,
  text: TextSymbol,
  number: NumberSymbol,
  exclude: ExcludeSymbol,
};

type OptionSymbolProps = {
  symbol: keyof typeof components;
};

const OptionSymbol: React.VFC<OptionSymbolProps> = ({ symbol }) => {
  const SymbolComponent = components[symbol];

  return <SymbolComponent className={styles.root} />;
};

export default OptionSymbol;
