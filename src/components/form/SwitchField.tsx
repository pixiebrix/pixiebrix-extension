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
import { FieldProps } from "@/components/form/FieldTemplate";
import { Col, Form as BootstrapForm, Row } from "react-bootstrap";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";

const SwitchField: React.FC<FieldProps> = ({
  name,
  label,
  onChange,
  value,
}) => (
  <BootstrapForm.Group as={Row} controlId={name}>
    <Col sm="3">
      <SwitchButtonWidget name={name} onChange={onChange} value={value} />
    </Col>
    <Col sm="9" as="label" htmlFor={name}>
      {label}
    </Col>
  </BootstrapForm.Group>
);

export default SwitchField;
