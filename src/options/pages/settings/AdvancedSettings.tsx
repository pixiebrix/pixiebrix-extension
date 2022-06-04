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

import styles from "./AdvancedSettings.module.scss";

import { Button, Card, Form } from "react-bootstrap";
import { DEFAULT_SERVICE_URL, useConfiguredHost } from "@/services/baseService";
import React, { useCallback } from "react";
import { clearExtensionAuth } from "@/auth/token";
import chromeP from "webext-polyfill-kinda";
import notify from "@/utils/notify";
import useFlags from "@/hooks/useFlags";
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { assertHttpsUrl } from "@/utils";
import { selectSettings } from "@/store/settingsSelectors";
import { uuidv4 } from "@/types/helpers";
import pTimeout from "p-timeout";

const SAVING_URL_NOTIFICATION_ID = uuidv4();
const SAVING_URL_TIMEOUT_MS = 4000;

const AdvancedSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { restrict, permit, flagOn } = useFlags();
  const { partnerId } = useSelector(selectSettings);

  const [serviceURL, setServiceURL] = useConfiguredHost();

  const clear = useCallback(async () => {
    await clearExtensionAuth();
    // Reload to force contentScripts and background page to reload. The RequireAuth component listens for auth changes,
    // but we should for non-extension context to reload too.
    location.reload();
    notify.success(
      "Cleared the extension token. Visit the web app to set it again"
    );
  }, []);

  const reload = useCallback(() => {
    browser.runtime.reload();
  }, []);

  const requestExtensionUpdate = useCallback(async () => {
    const status = await chromeP.runtime.requestUpdateCheck();
    if (status === "update_available") {
      browser.runtime.reload();
    } else if (status === "throttled") {
      notify.error({ message: "Too many update requests", reportError: false });
    } else {
      notify.info("No update available");
    }
  }, []);

  const handleServiceURLUpdate = useCallback(
    async (event: React.FocusEvent<HTMLInputElement>) => {
      const newPixiebrixUrl = event.target.value.trim();
      console.debug("Update service URL", { newPixiebrixUrl, serviceURL });

      try {
        // Ensure it's a valid URL
        if (newPixiebrixUrl) {
          assertHttpsUrl(newPixiebrixUrl);
        }
      } catch (error) {
        notify.error({
          id: SAVING_URL_NOTIFICATION_ID,
          error,
          reportError: false,
        });
        return;
      }

      try {
        if (newPixiebrixUrl) {
          // Ensure it's connectable
          const response = await pTimeout(
            fetch(new URL("api/me", newPixiebrixUrl).href),
            SAVING_URL_TIMEOUT_MS
          );

          // Ensure it returns a JSON response. It's just `{}` when the user is logged out.
          await response.json();
        }
      } catch {
        notify.error({
          id: SAVING_URL_NOTIFICATION_ID,
          message: "The URL does not appear to point to a PixieBrix server",
          reportError: false,
        });
        return;
      }

      await setServiceURL(newPixiebrixUrl);
      notify.success({
        id: SAVING_URL_NOTIFICATION_ID,
        message: "Service URL updated. The extension must be reloaded",
        dismissable: false,
        duration: Number.POSITIVE_INFINITY,
      });
    },
    [serviceURL, setServiceURL]
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
              defaultValue={serviceURL}
              onBlur={handleServiceURLUpdate}
              disabled={restrict("service-url")}
            />
          </Form.Group>
          {flagOn("partner-theming") && (
            <Form.Group controlId="partnerId">
              <Form.Label>Partner ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="my-company"
                defaultValue={partnerId ?? ""}
                onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                  dispatch(
                    settingsSlice.actions.setPartnerId({
                      partnerId: event.target.value,
                    })
                  );
                }}
              />
              <Form.Text muted>The partner id of a PixieBrix partner</Form.Text>
            </Form.Group>
          )}
        </Form>
      </Card.Body>
      <Card.Footer className={styles.cardFooter}>
        <Button variant="info" onClick={reload}>
          Reload Extension
        </Button>

        <Button variant="info" onClick={requestExtensionUpdate}>
          Check Updates
        </Button>

        {permit("clear-token") && (
          <Button variant="warning" onClick={clear}>
            Clear Token
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
};

export default AdvancedSettings;
