/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const PageTitle: React.FunctionComponent<{
  title: React.ReactNode;
  icon?: any;
}> = ({ title, icon }) => (
  <div className="page-header">
    <h3 className="page-title">
      {icon && (
        <span className="page-title-icon bg-gradient-primary text-white mr-2">
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      {title}
    </h3>
    {/*<nav aria-label="breadcrumb">*/}
    {/*    <ol className="breadcrumb">*/}
    {/*        <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Forms</a></li>*/}
    {/*        <li className="breadcrumb-item active" aria-current="page">Form elements</li>*/}
    {/*    </ol>*/}
    {/*</nav>*/}
  </div>
);

PageTitle.propTypes = {
  title: PropTypes.node.isRequired,
};
