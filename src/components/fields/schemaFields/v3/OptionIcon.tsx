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
import VariableIcon from "./optionIcons/var.svg?loadAsComponent";
import ArrayIcon from "./optionIcons/array.svg?loadAsComponent";
import ObjectIcon from "./optionIcons/object.svg?loadAsComponent";
import ToggleIcon from "./optionIcons/toggle.svg?loadAsComponent";
import SelectIcon from "./optionIcons/select.svg?loadAsComponent";
import TextIcon from "./optionIcons/text.svg?loadAsComponent";
import NumberIcon from "./optionIcons/number.svg?loadAsComponent";
import ExcludeIcon from "./optionIcons/exclude.svg?loadAsComponent";
import QuerySelector from "./optionIcons/querySelector.svg?loadAsComponent";
import styles from "./OptionIcon.module.scss";

const components = {
  variable: VariableIcon,
  array: ArrayIcon,
  object: ObjectIcon,
  toggle: ToggleIcon,
  select: SelectIcon,
  text: TextIcon,
  number: NumberIcon,
  exclude: ExcludeIcon,
  querySelector: QuerySelector,
};

type OptionIconProps = {
  icon: keyof typeof components;
};

const OptionIcon: React.VFC<OptionIconProps> = ({ icon }) => {
  const IconComponent = components[icon];

  return <IconComponent className={styles.root} />;
};

export default OptionIcon;
