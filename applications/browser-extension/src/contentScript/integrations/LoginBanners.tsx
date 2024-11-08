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
import AsyncButton from "../../components/AsyncButton";
import EmotionShadowRoot, { styleReset } from "../../components/EmotionShadowRoot";
import { Alert } from "react-bootstrap";
import bootstrapUrl from "../../vendors/bootstrapWithoutRem.css?loadAsUrl";
import stylesUrl from "./LoginBanners.scss?loadAsUrl";
import { Stylesheets } from "../../components/Stylesheets";
import type { DeferredLogin } from "./deferredLoginTypes";
import { launchInteractiveOAuthFlow } from "../../background/messenger/api";
import { type UUID } from "../../types/stringTypes";
import { getErrorMessage } from "../../errors/errorHelpers";
import notify from "../../utils/notify";

const LoginBanner: React.FC<DeferredLogin & { dismissLogin: () => void }> = ({
  integration,
  config,
  dismissLogin,
}) => {
  const label = config.label ?? integration.name;

  return (
    <Alert
      variant="danger"
      className="login-alert"
      data-configid={config.id}
      dismissible
      onClose={dismissLogin}
    >
      <div className="flex-grow-1">
        One or more mods are having a problem connecting to {label}. Please
        login to continue
      </div>
      <div>
        <AsyncButton
          className="login-button"
          variant="danger"
          size="sm"
          onClick={async () => {
            try {
              // Show an interactive login flow. `deferredLoginController` is listening for changes to authentication state
              await launchInteractiveOAuthFlow(config.id);
            } catch (error) {
              notify.error(getErrorMessage(error));
            }
          }}
        >
          Log in to {label}
        </AsyncButton>
      </div>
    </Alert>
  );
};

const LoginBanners: React.FC<{
  deferredLogins: DeferredLogin[];
  dismissLogin: (configId: UUID) => void;
}> = ({ deferredLogins, dismissLogin }) => {
  if (deferredLogins.length === 0) {
    return null;
  }

  return (
    <EmotionShadowRoot mode="open" style={styleReset}>
      <Stylesheets href={[bootstrapUrl, stylesUrl]}>
        {deferredLogins.map((x) => (
          <LoginBanner
            key={x.config.id}
            {...x}
            dismissLogin={() => {
              dismissLogin(x.config.id);
            }}
          />
        ))}
      </Stylesheets>
    </EmotionShadowRoot>
  );
};

export default LoginBanners;
