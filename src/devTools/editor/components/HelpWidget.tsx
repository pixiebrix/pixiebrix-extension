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

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Dropdown } from "react-bootstrap";
import { faCommentAlt, faExternalLinkAlt, faPhone } from "@fortawesome/free-solid-svg-icons";

const HelpWidget: React.FunctionComponent<{
  className?: string;
  toggleButtonClassName?: string;
}> = ({ className = "", toggleButtonClassName= "" }) => (
  <Dropdown className={className}>
    <Dropdown.Toggle id="support-dropdown" variant="info" className={toggleButtonClassName}>
      <FontAwesomeIcon icon={faCommentAlt} /> Live Support
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item href="https://calendly.com/pixiebrix-todd/live-support-session">
        <FontAwesomeIcon icon={faPhone} /> Schedule FREE Zoom session
      </Dropdown.Item>
      <Dropdown.Item href="https://docs.pixiebrix.com/">
        <FontAwesomeIcon icon={faExternalLinkAlt} /> Open Documentation
      </Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown>

);

export default HelpWidget;
