import React, { useCallback } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useToasts } from "react-toast-notifications";
import { optionsSlice, servicesSlice } from "../slices";
import { connect } from "react-redux";
import { PageTitle } from "@/layout/Page";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { useConfiguredHost, DEFAULT_SERVICE_URL } from "@/services/baseService";
import isEmpty from "lodash/isEmpty";
import { faCogs } from "@fortawesome/free-solid-svg-icons";

const { resetOptions } = optionsSlice.actions;
const { resetServices } = servicesSlice.actions;

interface OwnProps {
  resetOptions: () => void;
}

const Settings: React.FunctionComponent<OwnProps> = ({ resetOptions }) => {
  const { addToast } = useToasts();

  const [serviceURL, setServiceURL] = useConfiguredHost();

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
      <Row>
        <Col lg={6} md={8}>
          <Card border="danger">
            <Card.Header className="danger">Reset Settings</Card.Header>
            <Card.Body className="text-danger">
              <p className="card-text">
                Click here to reset all the options.{" "}
                <b>This will delete any bricks you've installed.</b>
              </p>
              <Button
                variant="danger"
                onClick={() => {
                  resetOptions();
                  addToast("Reset all options and service configurations", {
                    appearance: "success",
                    autoDismiss: true,
                  });
                }}
              >
                Factory Reset
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-5">
        <Col lg={6} md={8}>
          <Card>
            <Card.Header>Advanced Settings</Card.Header>
            <Card.Body>
              <p className="card-text">
                Only change these settings if you know what you're doing!{" "}
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
