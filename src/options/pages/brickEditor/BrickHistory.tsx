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
import { Col, Row } from "react-bootstrap";
import Select from "react-select";

const BrickHistory: React.FunctionComponent = () => {
  return (
    <Row>
      <Col xs={12} className="pb-3">
        Compare past versions of this brick by selecting the versions below.
      </Col>
      <Col xs={4}>
        <Select
          placeholder="Select a version"
          options={[
            { value: 1, label: "one" },
            { value: 2, label: "two" },
          ]}
        />
      </Col>
      <Col xs={4}>
        <Select
          placeholder="Select a version"
          options={[
            { value: 1, label: "one" },
            { value: 2, label: "two" },
          ]}
        />
      </Col>
    </Row>
  );
};

export default BrickHistory;
