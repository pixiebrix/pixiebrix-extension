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

import React, { ChangeEvent } from "react";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { CustomFieldWidget } from "@/components/form/FieldTemplate";
import styles from "./SwitchButtonWidget.module.scss";

export type CheckBoxLike = {
  name: string;
  value: boolean;
};

const SwitchButtonWidget: CustomFieldWidget<boolean, CheckBoxLike> = ({
  name,
  onChange,
  value,
}) => {
  const patchedOnChange = (checked: boolean) => {
    onChange({
      target: { value: checked, name },
    } as ChangeEvent<CheckBoxLike>);
  };

  return (
    <div className={styles.root}>
      <BootstrapSwitchButton
        onlabel=" "
        offlabel=" "
        checked={value}
        onChange={patchedOnChange}
      />
    </div>
  );
};

export default SwitchButtonWidget;
