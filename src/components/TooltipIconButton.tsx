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
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const TooltipIconButton: React.FC<{
  name: string;
  icon: IconProp;
  onClick: () => void;
  tooltipText: string;
}> = ({ name, icon, onClick, tooltipText }) => {
  const renderTooltip = (props: unknown) => (
    <Tooltip id={`${name}-tooltip`} {...props}>
      {tooltipText}
    </Tooltip>
  );

  // Not sure why this is throwing warnings,
  // the missing props aren't actually required.
  // noinspection RequiredAttributes
  return (
    <OverlayTrigger
      placement="auto"
      delay={{ show: 150, hide: 100 }}
      overlay={renderTooltip}
      rootClose
    >
      {({ ref, ...rest }) => (
        <button type="button" onClick={onClick} {...rest}>
          <FontAwesomeIcon forwardedRef={ref} icon={icon} />
        </button>
      )}
    </OverlayTrigger>
  );
};

export default TooltipIconButton;
