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
import { Schema } from "@/core";
import { ListGroup } from "react-bootstrap";

const PrimitiveEntry: React.FunctionComponent<{
  prop: string;
  definition: Schema;
}> = ({ prop, definition }) => {
  const { type = "unknown", format } = definition;
  // FIXME: template can be an array https://github.com/pixiebrix/pixiebrix-extension/issues/990
  return (
    <ListGroup.Item key={prop}>
      <span>{prop}</span>
      <span className="type">: {format ? `${format} ${type}` : type}</span>
    </ListGroup.Item>
  );
};

export default PrimitiveEntry;
