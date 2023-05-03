/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import styles from "./Sidebar.module.scss";

import React from "react";
import { CSSTransition } from "react-transition-group";
import { type CSSTransitionProps } from "react-transition-group/CSSTransition";
import SidebarCollapsed from "./SidebarCollapsed";
import SidebarExpanded from "./SidebarExpanded";
import { useDispatch, useSelector } from "react-redux";
import { selectModuleListExpanded } from "@/pageEditor/slices/editorSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";

const transitionProps: CSSTransitionProps = {
  classNames: {
    enter: styles.enter,
    enterActive: styles.enterActive,
    exit: styles.exit,
    exitActive: styles.exitActive,
  },
  timeout: 500,
  unmountOnExit: true,
  mountOnEnter: true,
};

const Sidebar: React.VFC = () => {
  const dispatch = useDispatch();

  const expanded = useSelector(selectModuleListExpanded);

  return (
    <>
      <CSSTransition {...transitionProps} in={!expanded}>
        <SidebarCollapsed
          expandSidebar={() => {
            dispatch(
              actions.setModListExpanded({
                isExpanded: true,
              })
            );
          }}
        />
      </CSSTransition>
      <CSSTransition {...transitionProps} in={expanded}>
        <SidebarExpanded
          collapseSidebar={() => {
            dispatch(
              actions.setModListExpanded({
                isExpanded: false,
              })
            );
          }}
        />
      </CSSTransition>
    </>
  );
};

export default Sidebar;
