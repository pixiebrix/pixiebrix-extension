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
import { isEmpty } from "lodash";
import notify from "@/utils/notify";
import useFlags from "@/hooks/useFlags";
import settingsSlice from "@/store/settingsSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectSettings } from "@/store/settingsSelectors";

const AdvancedSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { restrict, permit } = useFlags();
  const { theme } = useSelector(selectSettings);

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

  const update = useCallback(async () => {
    const status = await chromeP.runtime.requestUpdateCheck();
    if (status === "update_available") {
      browser.runtime.reload();
    } else if (status === "throttled") {
      notify.error({ message: "Too many update requests", reportError: false });
    } else {
      notify.info("No update available");
    }
  }, []);

  const handleUpdate = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const newURL = event.target.value;
      console.debug("Update service URL", { newURL, serviceURL });
      if (newURL === serviceURL || (isEmpty(newURL) && isEmpty(serviceURL))) {
        return;
      }

      await setServiceURL(newURL);
      notify.success("Updated the service URL");
    },
    [serviceURL, setServiceURL]
  );

  return (
    <Card>
      <Card.Header>Advanced Settings</Card.Header>
      <Card.Body>
        <Card.Text>
          Only change these settings if you know what you&apos;re doing!{" "}
          <b>After making changes, reload the extension.</b>
        </Card.Text>
        <Form>
          <Form.Group controlId="formServiceURL">
            <Form.Label>PixieBrix URL</Form.Label>
            <Form.Control
              type="text"
              placeholder={DEFAULT_SERVICE_URL}
              defaultValue={serviceURL}
              onBlur={handleUpdate}
              disabled={restrict("service-url")}
            />
            <Form.Text className="text-muted">
              The PixieBrix service URL
            </Form.Text>
          </Form.Group>
          {restrict("partner-theming") && (
            <Form.Group controlId="partnerId">
              <Form.Label>Partner ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="my-company"
                defaultValue={theme}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch(
                    settingsSlice.actions.setTheme({
                      theme: event.target.value,
                    })
                  );
                }}
              />
              <Form.Text className="text-muted">
                The partner id of a PixieBrix partner
              </Form.Text>
            </Form.Group>
          )}
        </Form>
      </Card.Body>
      <Card.Footer className={styles.cardFooter}>
        <Button variant="info" onClick={reload}>
          Reload Extension
        </Button>

        <Button variant="info" onClick={update}>
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
