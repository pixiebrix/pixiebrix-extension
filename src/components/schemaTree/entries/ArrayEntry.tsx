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
import { ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { TreeRenderer } from "@/components/schemaTree/types";

const ArrayEntry: React.FunctionComponent<{
  prop: string;
  definition: Schema;
  TreeRenderer: TreeRenderer;
}> = ({ prop, definition, TreeRenderer }) => {
  const [collapsed, setCollapsed] = useState(true);

  const items = definition.items ?? { type: "unknown" };
  const itemType = ((items as Schema) ?? {}).type;

  if (itemType === "object") {
    return (
      <ListGroup.Item>
        <div
          onClick={() => {
            setCollapsed(!collapsed);
          }}
          style={{ cursor: "pointer" }}
        >
          <FontAwesomeIcon icon={collapsed ? faCaretRight : faCaretDown} />{" "}
          <span>{prop}</span>
          <span className="type">: array of objects</span>
        </div>
        {!collapsed && (
          // @ts-expect-error we filtered over the boolean case
          <TreeRenderer schema={items} />
        )}
      </ListGroup.Item>
    );
  }

  return (
    <ListGroup.Item>
      <span>{prop}</span>
      <span className="type">: array of {itemType ?? "unknown"}</span>
    </ListGroup.Item>
  );
};

export default ArrayEntry;
