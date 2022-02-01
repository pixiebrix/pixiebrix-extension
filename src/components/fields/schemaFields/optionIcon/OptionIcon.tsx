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

import React from "react";
import VariableIcon from "./icons/var.svg?loadAsComponent";
import ArrayIcon from "./icons/array.svg?loadAsComponent";
import ObjectIcon from "./icons/object.svg?loadAsComponent";
import ToggleIcon from "./icons/toggle.svg?loadAsComponent";
import SelectIcon from "./icons/select.svg?loadAsComponent";
import TextIcon from "./icons/text.svg?loadAsComponent";
import NumberIcon from "./icons/number.svg?loadAsComponent";
import ExcludeIcon from "./icons/exclude.svg?loadAsComponent";
import QuerySelector from "./icons/querySelector.svg?loadAsComponent";
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
