/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback, useContext, useState } from "react";
import { useToasts } from "react-toast-notifications";
import { optionsSlice, servicesSlice } from "../slices";
import { connect } from "react-redux";
import { PageTitle } from "@/layout/Page";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import { DEFAULT_SERVICE_URL, useConfiguredHost } from "@/services/baseService";
import { isEmpty } from "lodash";
import { faCogs, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { clearExtensionAuth } from "@/auth/token";
import { browser } from "webextension-polyfill-ts";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { getDNT, toggleDNT } from "@/background/telemetry";
import useAsyncEffect from "use-async-effect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AuthContext from "@/auth/context";
import { useLoggingConfig } from "@/hooks/logging";
import { GridLoader } from "react-spinners";

const { resetOptions } = optionsSlice.actions;
const { resetServices } = servicesSlice.actions;

interface OwnProps {
  resetOptions: () => void;
}

function useDNT(): [boolean, (enabled: boolean) => Promise<void>] {
  const [enabled, setEnabled] = useState<boolean>(true);

  useAsyncEffect(async () => {
    setEnabled(await getDNT());
  }, [setEnabled]);

  const toggle = useCallback(
    async (enabled: boolean) => {
      setEnabled(await toggleDNT(enabled));
    },
    [setEnabled]
  );

  return [enabled, toggle];
}

// const PermissionsRow: React.FunctionComponent = () => {
//   const [permissions] = useAsyncState<Permissions.AnyPermissions>(async () => {
//     return await browser.permissions.getAll();
//   }, []);
//
//   return (
//       <Row className="mb-4">
//         <Col lg={6} md={8}>
//           <Card>
//             <Card.Header>Permissions</Card.Header>
//             <ListGroup variant="flush">
//               {(permissions?.origins ?? []).map(origin => (
//                   <ListGroup.Item key={origin}>
//                     {origin}
//                   </ListGroup.Item>
//               ))}
//             </ListGroup>
//
//           </Card>
//         </Col>
//       </Row>
//   )
// }

const LoggingRow: React.FunctionComponent = () => {
  const [config, setConfig] = useLoggingConfig();

  return (
    <Row className="mb-4">
      <Col lg={6} md={8}>
        <Card>
          <Card.Header>Developer Settings</Card.Header>
          <Card.Body>
            <Card.Text className="text-info">
              <FontAwesomeIcon icon={faInfoCircle} /> Enable value logging to
              include brick inputs/outputs in the brick logs. Brick logs are
              never transmitted from your browser
            </Card.Text>

            {config ? (
              <Form>
                <Form.Group controlId="logging">
                  <div>
                    <Form.Label>
                      Log values:{" "}
                      <i>{config.logValues ? "Enabled" : "Disabled"}</i>
                    </Form.Label>
                  </div>
                  <BootstrapSwitchButton
                    size="sm"
                    onstyle="info"
                    offstyle="light"
                    onlabel=" "
                    offlabel=" "
                    checked={config.logValues}
                    onChange={(value) =>
                      setConfig({ ...config, logValues: value })
                    }
                  />
                </Form.Group>
              </Form>
            ) : (
              <GridLoader />
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

const PrivacyRow: React.FunctionComponent = () => {
  const [dnt, toggleDNT] = useDNT();

  return (
    <Row className="mb-4">
      <Col lg={6} md={8}>
        <Card>
          <Card.Header>Privacy</Card.Header>
          <Card.Body>
            <Card.Text className="text-info">
              <FontAwesomeIcon icon={faInfoCircle} /> PixieBrix collects{" "}
              <i>anonymous</i> error telemetry and usage metrics to help us
              improve the product.
            </Card.Text>

            <Card.Text>
              We do not collect any browser content or history. The information
              we collect is not linked to your PixieBrix account. See our{" "}
              <a href="https://www.pixiebrix.com/privacy/">Privacy Policy</a>{" "}
              for a detailed list of what information we track and why.
            </Card.Text>

            <Form>
              <Form.Group controlId="telemetry">
                <div>
                  <Form.Label>
                    Anonymous Telemetry: <i>{dnt ? "Disabled" : "Enabled"}</i>
                  </Form.Label>
                </div>
                <BootstrapSwitchButton
                  size="sm"
                  onstyle="info"
                  offstyle="light"
                  onlabel=" "
                  offlabel=" "
                  checked={!(dnt ?? false)}
                  onChange={(value) => toggleDNT(!value)}
                />
              </Form.Group>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

const Settings: React.FunctionComponent<OwnProps> = ({ resetOptions }) => {
  const { addToast } = useToasts();

  const [serviceURL, setServiceURL] = useConfiguredHost();

  const { organization } = useContext(AuthContext);

  const clear = useCallback(async () => {
    await clearExtensionAuth();
    location.reload();
    addToast("Cleared the extension token. Visit the web app to set it again", {
      appearance: "success",
      autoDismiss: true,
    });
  }, []);

  const reload = useCallback(() => {
    browser.runtime.reload();
  }, []);

  const handleUpdate = useCallback(
    async (event) => {
      const newURL = event.target.value;
      console.debug("Update service URL", { newURL, serviceURL });
      if (newURL === serviceURL || (isEmpty(newURL) && isEmpty(serviceURL))) {
        return;
      }
      await setServiceURL(newURL);
      addToast("Updated the service URL", {
        appearance: "success",
        autoDismiss: true,
      });
    },
    [serviceURL, setServiceURL]
  );

  return (
    <>
      <PageTitle icon={faCogs} title="Extension Settings" />
      <div className="pb-4">
        <p>
          Settings for the PixieBrix browser extension. To edit the settings for
          your PixieBrix account, visit the{" "}
          <a href="https://app.pixiebrix.com/settings">
            Account Settings web page
          </a>
        </p>
      </div>

      {organization == null && <PrivacyRow />}

      <LoggingRow />

      {/* Permission API just lists what's in the manifest. Not what's currently granted */}
      {/*<PermissionsRow/>*/}

      <Row className="mb-4">
        <Col lg={6} md={8}>
          <Card border="danger">
            <Card.Header className="danger">Factory Reset</Card.Header>
            <Card.Body className="text-danger">
              <p className="card-text">
                Click here to reset your local PixieBrix data.{" "}
                <b>This will delete any bricks you&apos;ve installed.</b>
              </p>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    resetOptions();
                    await browser.contextMenus.removeAll();
                    addToast("Reset all options and service configurations", {
                      appearance: "success",
                      autoDismiss: true,
                    });
                  } catch (err) {
                    addToast(
                      `Error resetting options and service configurations: ${
                        err.message?.toString() ?? "Unknown error"
                      }`,
                      {
                        appearance: "error",
                        autoDismiss: true,
                      }
                    );
                  }
                }}
              >
                Factory Reset
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={6} md={8}>
          <Card>
            <Card.Header>Advanced Settings</Card.Header>
            <Card.Body>
              <p className="card-text">
                Only change these settings if you know what you&apos;re doing!{" "}
                <b>After making changes, reload the extension.</b>
              </p>
              <Form>
                <Form.Group controlId="formServiceURL">
                  <Form.Label>PixieBrix URL</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={DEFAULT_SERVICE_URL}
                    defaultValue={serviceURL}
                    onBlur={handleUpdate}
                  />
                  <Form.Text className="text-muted">
                    The PixieBrix service URL
                  </Form.Text>
                </Form.Group>
              </Form>
            </Card.Body>
            <Card.Footer>
              <Button variant="info" onClick={reload}>
                Reload Extension
              </Button>
              <Button variant="warning" onClick={clear}>
                Clear Token
              </Button>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default connect(null, (dispatch) => ({
  resetOptions: () => {
    dispatch(resetOptions());
    dispatch(resetServices());
  },
}))(Settings);
