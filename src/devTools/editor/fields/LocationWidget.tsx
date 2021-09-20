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

import { CustomFieldWidget } from "@/components/form/FieldTemplate";
import { useField } from "formik";
import React from "react";
import type { SelectMode } from "@/nativeEditor/selector";
import SelectorSelectorWidget from "@/devTools/editor/fields/SelectorSelectorWidget";

type OwnProps = {
  selectMode?: SelectMode;
};

const LocationWidget: CustomFieldWidget<OwnProps> = ({
  selectMode = "container",
  ...props
}) => {
  const [containerInfoField] = useField("containerInfo");

  return (
    <SelectorSelectorWidget
      {...props}
      initialElement={containerInfoField.value}
      selectMode={selectMode}
    />
  );
};

export default LocationWidget;
