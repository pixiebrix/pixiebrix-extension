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

import TrialCallToActionLink from "@/extensionConsole/pages/teamTrials/TrialCallToActionLink";
import useGetAllTeamScopes from "@/extensionConsole/pages/teamTrials/useGetAllTeamScopes";
import useTeamTrialStatus, {
  TeamTrialStatus,
} from "@/extensionConsole/pages/teamTrials/useTeamTrialStatus";
import { type RegistryId } from "@/types/registryTypes";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import {
  type ButtonProps,
  OverlayTrigger,
  Button,
  Tooltip,
} from "react-bootstrap";

export const TrialExpiredTooltip = (
  <Tooltip id="trial-tooltip">
    <p>
      Your Business Plan trial <strong>has ended</strong>.
    </p>
    <p>
      Talk to an onboarding specialist to keep using team features.{" "}
      <TrialCallToActionLink />
    </p>
  </Tooltip>
);

function shouldDisableButton({
  isExpired,
  modId,
  teamScopes,
}: {
  isExpired: boolean;
  modId: RegistryId;
  teamScopes: string[];
}) {
  return isExpired && teamScopes.some((scope) => modId.startsWith(scope));
}

export const TrialAwareButton = ({
  modId,
  icon,
  disabled: propsDisabled,
  children,
  ...buttonProps
}: ButtonProps & { icon?: IconProp; modId: RegistryId }) => {
  const [show, setShow] = useState(false);
  const isExpired = useTeamTrialStatus() === TeamTrialStatus.EXPIRED;
  const teamScopes = useGetAllTeamScopes();
  const disabled =
    shouldDisableButton({ isExpired, modId, teamScopes }) || propsDisabled;

  return (
    <OverlayTrigger
      // Delay hiding the tooltip to allow users to click the link
      delay={{ show: 500, hide: 1500 }}
      placement="bottom"
      show={show}
      onToggle={(nextShow) => {
        if (isExpired) {
          setShow(nextShow);
        }
      }}
      overlay={TrialExpiredTooltip}
    >
      {({ ref: overlayRef, ...overlayProps }) => (
        <span ref={overlayRef} {...overlayProps}>
          <Button variant="primary" disabled={disabled} {...buttonProps}>
            {icon && (
              <>
                <FontAwesomeIcon icon={icon} />
                &nbsp;
              </>
            )}
            {children}
          </Button>
        </span>
      )}
    </OverlayTrigger>
  );
};
