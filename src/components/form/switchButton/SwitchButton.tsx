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

import React, { ChangeEvent, ReactNode } from "react";
import { Col, Form as BootstrapForm, Row } from "react-bootstrap";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import styles from "./SwitchButton.module.scss";

type CheckBoxLike = {
  name: string;
  value: boolean;
};

export type SwitchButtonProps = {
  name: string;
  label: ReactNode;
  onChange: React.ChangeEventHandler<CheckBoxLike>;
  value?: boolean;
};

const SwitchButton: React.FC<SwitchButtonProps> = ({
  name,
  label,
  onChange,
  value,
}) => {
  const patchedOnChange = (checked: boolean) => {
    onChange({
      target: { value: checked, name },
    } as ChangeEvent<CheckBoxLike>);
  };

  return (
    <BootstrapForm.Group as={Row} controlId={name}>
      <Col sm="3">
        {/* BootstrapSwitchButton is for UI, sends click to the input */}
        <BootstrapSwitchButton
          onlabel=" "
          offlabel=" "
          checked={value}
          onChange={patchedOnChange}
        />
      </Col>
      <Col sm="9" className={styles.label}>
        {label}
      </Col>
    </BootstrapForm.Group>
  );
};

export default SwitchButton;
