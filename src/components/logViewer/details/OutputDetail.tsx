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
import { LogEntry } from "@/background/logging";
import { Col, Row } from "react-bootstrap";
import JsonTree from "@/components/jsonTree/JsonTree";

const OutputDetail: React.FunctionComponent<{ entry: LogEntry }> = ({
  entry,
}) => (
  <Row>
    <Col>
      {entry.data.outputKey && <code>{entry.data.outputKey}</code>}
      <JsonTree data={entry.data.output} />
    </Col>
  </Row>
);

export default OutputDetail;
