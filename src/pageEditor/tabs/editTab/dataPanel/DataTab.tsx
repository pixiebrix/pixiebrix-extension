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
import { Tab, TabPaneProps } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";

type TabStateProps = {
  isLoading?: boolean;
  isTraceEmpty?: boolean;
  isTraceOptional?: boolean;
};

const DataTab: React.FC<TabPaneProps & TabStateProps> = ({
  isTraceEmpty = false,
  isTraceOptional = false,
  children,
  ...tabProps
}) => {
  let contents;
  if (isTraceEmpty && isTraceOptional) {
    contents = (
      <>
        <div className="text-muted">
          No trace available, run the extension to generate data
        </div>

        <div className="text-info mt-2">
          <FontAwesomeIcon icon={faInfoCircle} />
          &nbsp;This brick supports traceless output previews. See the Preview
          tab for the current preview
        </div>
      </>
    );
  } else if (isTraceEmpty) {
    contents = (
      <div className="text-muted">
        No trace available, run the extension to generate data
      </div>
    );
  } else {
    contents = children;
  }

  return (
    <Tab.Pane
      mountOnEnter
      unmountOnExit
      {...tabProps}
      className={dataPanelStyles.tabPane}
    >
      {contents}
    </Tab.Pane>
  );
};

export default DataTab;
