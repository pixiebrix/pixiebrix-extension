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

import styles from "./SettingsCard.module.scss";

// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Button, Card, Form } from "react-bootstrap";
import React, { useCallback } from "react";
import {
  clearCachedAuthSecrets,
  clearPartnerAuthData,
} from "@/auth/authStorage";
import notify from "@/utils/notify";
import useFlags from "@/hooks/useFlags";
import settingsSlice, {
  useActivatePartnerTheme,
} from "@/store/settings/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectSettings } from "@/store/settings/settingsSelectors";
import { validateRegistryId } from "@/types/helpers";
import useUserAction from "@/hooks/useUserAction";
import { isEmpty } from "lodash";
import { util as apiUtil } from "@/data/service/api";
import useDiagnostics from "@/extensionConsole/pages/settings/useDiagnostics";
import AsyncButton from "@/components/AsyncButton";
import { reloadIfNewVersionIsReady } from "@/utils/extensionUtils";
import { DEFAULT_SERVICE_URL } from "@/urlConstants";
import { PIXIEBRIX_INTEGRATION_ID } from "@/integrations/constants";
import { refreshPartnerAuthentication } from "@/background/messenger/api";
import useServiceUrlSetting from "@/extensionConsole/pages/settings/useServiceUrlSetting";
import useDeploymentKeySetting from "@/extensionConsole/pages/settings/useDeploymentKeySetting";

const AdvancedSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { restrict, permit, flagOn } = useFlags();
  const { partnerId, authIntegrationId, authMethod } =
    useSelector(selectSettings);
  const { exportDiagnostics } = useDiagnostics();
  const activatePartnerTheme = useActivatePartnerTheme();
  const [serviceUrl, setServiceUrl] = useServiceUrlSetting();
  const [deploymentKey, setDeploymentKey] = useDeploymentKeySetting();

  const clear = useCallback(async () => {
    await clearCachedAuthSecrets();
    // The success message will just flash up, because the page reloads on the next line
    notify.success(
      "Cleared the browser extension token. Visit the web app to set it again",
    );
    // Reload to force contentScripts and background page to reload. The RequireAuth component listens for auth changes,
    // but we should for non-extension context to reload too.
    location.reload();
  }, []);

  const clearTokens = useUserAction(
    async () => {
      // Force reset of all queries, and partner bearer JWT will no longer be present.
      // NOTE: currently the Navbar will show the user information, as it falls back to cached auth
      await clearPartnerAuthData();
      dispatch(apiUtil.resetApiState());
    },
    {
      successMessage: "Cleared all cached OAuth2 tokens",
      errorMessage: "Error clearing cached OAuth2 tokens",
    },
    [dispatch],
  );

  const reloadExtension = useCallback(() => {
    browser.runtime.reload();
  }, []);

  const requestExtensionUpdate = useCallback(async () => {
    const status = await reloadIfNewVersionIsReady();
    if (status === "throttled") {
      notify.error({ message: "Too many update requests", reportError: false });
    } else {
      notify.info("No update available");
    }
  }, []);

  const testPartnerRefreshToken = useUserAction(
    async () => {
      await refreshPartnerAuthentication();
    },
    {
      successMessage: "Successfully refreshed the partner token",
      errorMessage: "Error refreshing the partner token",
    },
    [],
  );

  return (
    <Card>
      <Card.Header>Advanced Settings</Card.Header>
      <Card.Body>
        <Card.Text>
          Only change these settings if you know what you&apos;re doing!
        </Card.Text>
        <Form>
          <Form.Group controlId="formServiceURL">
            <Form.Label>PixieBrix URL</Form.Label>
            <Form.Control
              type="text"
              placeholder={DEFAULT_SERVICE_URL}
              defaultValue={serviceUrl}
              onBlur={async (event: React.FocusEvent<HTMLInputElement>) => {
                await setServiceUrl(event.target.value);
              }}
              disabled={restrict("service-url")}
            />
            <Form.Text muted>The base URL of the PixieBrix API</Form.Text>
          </Form.Group>
          {flagOn("deployment-key") && (
            <Form.Group controlId="deploymentKey">
              <Form.Label>Deployment Key</Form.Label>
              <Form.Control
                type="text"
                defaultValue={deploymentKey ?? ""}
                onBlur={async (event: React.FocusEvent<HTMLInputElement>) => {
                  await setDeploymentKey(event.target.value);
                }}
              />
              <Form.Text muted>
                A shared key for receiving mod deployments without user
                authentication
              </Form.Text>
            </Form.Group>
          )}
          <Form.Group controlId="formAuthIntegration">
            <Form.Label>Authentication Integration</Form.Label>
            <Form.Control
              type="text"
              placeholder={PIXIEBRIX_INTEGRATION_ID}
              defaultValue={authIntegrationId ?? ""}
              onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                try {
                  dispatch(
                    settingsSlice.actions.setAuthIntegrationId({
                      integrationId: isEmpty(event.target.value)
                        ? null
                        : validateRegistryId(event.target.value),
                    }),
                  );
                } catch (error) {
                  notify.error({
                    message: "Error setting authentication integration",
                    error,
                  });
                }
              }}
              disabled={restrict("service-url")}
            />
            <Form.Text muted>
              The id of the integration for authenticating with the PixieBrix
              API
            </Form.Text>
          </Form.Group>
          <Form.Group controlId="partnerId">
            <Form.Label>Partner ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="my-company"
              defaultValue={partnerId ?? ""}
              onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                activatePartnerTheme(event.target.value);
              }}
            />
            <Form.Text muted>The partner id of a PixieBrix partner</Form.Text>
          </Form.Group>

          <Form.Group controlId="authMethod">
            <Form.Label>Authentication Method</Form.Label>
            <Form.Control
              type="text"
              placeholder="default"
              defaultValue={authMethod ?? "default"}
              onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                dispatch(
                  settingsSlice.actions.setAuthMethod({
                    authMethod: event.target.value,
                  }),
                );
              }}
            />
            <Form.Text muted>
              Provide an authentication type to force authentication
            </Form.Text>
          </Form.Group>
        </Form>
      </Card.Body>
      <Card.Footer className={styles.cardFooter}>
        <Button variant="info" onClick={reloadExtension}>
          Reload Extension
        </Button>

        <Button variant="info" onClick={requestExtensionUpdate}>
          Check Updates
        </Button>

        <AsyncButton variant="info" onClick={exportDiagnostics}>
          Export Diagnostics
        </AsyncButton>

        {permit("clear-token") && (
          <Button variant="warning" onClick={clear}>
            Clear PixieBrix Token
          </Button>
        )}

        {permit("clear-token") && (
          <Button variant="warning" onClick={clearTokens}>
            Clear OAuth2 Tokens
          </Button>
        )}

        <Button variant="warning" onClick={testPartnerRefreshToken}>
          Test Partner Refresh Token
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default AdvancedSettings;
