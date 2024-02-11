/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import SidebarExpanded from "./SidebarExpanded";
import { useDispatch, useSelector } from "react-redux";
import { selectModuleListExpanded } from "@/pageEditor/slices/editorSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";
import { Button, Collapse } from "react-bootstrap";
import SidebarCollapsed from "./SidebarCollapsed";

const Sidebar: React.VFC = () => {
  const dispatch = useDispatch();

  const expanded = useSelector(selectModuleListExpanded);

  return (
    <>
      {
        <SidebarCollapsed
          expandSidebar={() => {
            dispatch(
              actions.setModListExpanded({
                isExpanded: true,
              }),
            );
          }}
        />
      }
      <Collapse
        dimension="width"
        in={expanded}
        unmountOnExit={true}
        mountOnEnter={true}
      >
        <div>
          <div id="example-collapse-text" style={{ width: "270px" }}>
            <SidebarExpanded
              collapseSidebar={() => {
                dispatch(
                  actions.setModListExpanded({
                    isExpanded: false,
                  }),
                );
              }}
            />
          </div>
        </div>
      </Collapse>
    </>
  );
};

export default Sidebar;
