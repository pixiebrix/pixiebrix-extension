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

import React, { useState } from "react";
import { Schema } from "@/core";
import { isEmpty } from "lodash";
import { ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { TreeRenderer } from "@/components/schemaTree/types";

const ObjectEntry: React.FunctionComponent<{
  prop: string;
  definition: Schema;
  TreeRenderer: TreeRenderer;
}> = ({ prop, definition, TreeRenderer }) => {
  const [collapsed, setCollapsed] = useState(true);

  if (isEmpty(definition.properties)) {
    return (
      <ListGroup.Item key={prop}>
        <span>
          <code>{prop}</code>
        </span>
        <span className="type badge badge-pill badge-secondary ml-1">
          object
        </span>
      </ListGroup.Item>
    );
  }

  return (
    <ListGroup.Item key={prop}>
      <div
        onClick={() => {
          setCollapsed(!collapsed);
        }}
        style={{ cursor: "pointer" }}
      >
        <FontAwesomeIcon icon={collapsed ? faCaretRight : faCaretDown} />{" "}
        <span>
          <code>{prop}</code>
        </span>
        <span className="type badge badge-pill badge-secondary ml-1">
          object
        </span>
      </div>
      {!collapsed && <TreeRenderer schema={definition} />}
    </ListGroup.Item>
  );
};

export default ObjectEntry;
