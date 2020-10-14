import Table from "react-bootstrap/Table";
import isEmpty from "lodash/isEmpty";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import React, { useMemo } from "react";
import extensionPointRegistry from "@/extensionPoints/registry";
import { optionsSlice, OptionsState } from "../slices";
import Button from "react-bootstrap/Button";
import { useToasts } from "react-toast-notifications";
import { PageTitle } from "@/layout/Page";
import { useExtensionPermissions } from "@/permissions";
import { BeatLoader } from "react-spinners";
import Card from "react-bootstrap/Card";
import {
  faCheck,
  faExclamation,
  faCubes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  ExtensionValidationResult,
  useExtensionValidator,
} from "@/validators/generic";
import { IExtension } from "@/core";

const { removeExtension } = optionsSlice.actions;

type RemoveAction = ({
  extensionId,
  extensionPointId,
}: {
  extensionId: string;
  extensionPointId: string;
}) => void;

function validationMessage(validation: ExtensionValidationResult) {
  let message = "Invalid Configuration";
  if (validation.notConfigured.length) {
    const services = validation.notConfigured.map((x) => x.serviceId);
    if (services.length > 1) {
      message = `You need to select configurations for ${services.join(", ")}`;
    } else {
      message = `You need to select a configuration for ${services[0]}`;
    }
  } else if (validation.missingConfiguration.length) {
    const services = validation.missingConfiguration.map((x) => x.serviceId);
    message = `
      The following services use configurations that no longer exist: ${services.join(
        ", "
      )}`;
  } else {
    console.debug("Validation result", validation);
  }
  return message;
}

const ExtensionRow: React.FunctionComponent<{
  extension: IExtension;
  onRemove: RemoveAction;
}> = ({ extension, onRemove }) => {
  const { id, label, extensionPointId } = extension;
  const { addToast } = useToasts();
  const [hasPermissions, requestPermissions] = useExtensionPermissions(
    extension
  );
  const [validation] = useExtensionValidator(extension);

  const statusElt = useMemo(() => {
    if (hasPermissions == null || validation == null) {
      return <BeatLoader />;
    } else if (validation && !validation.valid) {
      return (
        <span className="text-danger text-wrap">
          <FontAwesomeIcon icon={faExclamation} />{" "}
          {validationMessage(validation)}
        </span>
      );
    } else if (hasPermissions) {
      return (
        <span>
          <FontAwesomeIcon icon={faCheck} /> Active
        </span>
      );
    } else {
      return (
        <Button variant="info" size="sm" onClick={requestPermissions}>
          Grant Permissions
        </Button>
      );
    }
  }, [hasPermissions, requestPermissions, validation]);

  return (
    <tr>
      <td>{extensionPointRegistry.lookup(extensionPointId).name}</td>
      <td>
        <Link to={`/workshop/extensions/${extension.id}`}>{label ?? id}</Link>
      </td>
      <td className="text-wrap">{statusElt}</td>
      <td>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            onRemove({ extensionId: id, extensionPointId });
            addToast(`Removed brick ${label ?? id}`, {
              appearance: "success",
              autoDismiss: true,
            });
          }}
        >
          Uninstall
        </Button>
      </td>
    </tr>
  );
};

const Installed: React.FunctionComponent<{
  extensions: IExtension[];
  onRemove: RemoveAction;
}> = ({ extensions, onRemove }) => {
  return (
    <div>
      <PageTitle icon={faCubes} title="Active Bricks" />

      <Row>
        <Col>
          <div className="pb-4">
            <p>
              Here&apos;s a list of bricks you currently have activated. You can
              find more to activate in the{" "}
              <Link to={"/marketplace"}>Marketplace</Link>
            </p>
          </div>
        </Col>
      </Row>
      <Row>
        <Col xl={9} lg={10} md={12}>
          <Card>
            <Card.Header>Active Bricks</Card.Header>
            <Table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Uninstall</th>
                </tr>
              </thead>
              <tbody>
                {extensions.map((extension) => (
                  <ExtensionRow
                    key={extension.id}
                    extension={extension}
                    onRemove={onRemove}
                  />
                ))}
                {isEmpty(extensions) && (
                  <tr>
                    <td colSpan={4}>
                      No bricks installed yet. Find some in the{" "}
                      <Link to={"/marketplace"}>Marketplace</Link>
                    </td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

Installed.propTypes = {
  extensions: PropTypes.array,
};

function selectExtensions(state: { options: OptionsState }) {
  return Object.entries(state.options.extensions).flatMap(
    ([extensionPointId, pointExtensions]) =>
      Object.entries(pointExtensions).map(([extensionId, extension]) => ({
        id: extensionId,
        extensionPointId,
        ...extension,
      }))
  );
}

export default connect(
  (state: { options: OptionsState }) => ({
    extensions: selectExtensions(state),
  }),
  { onRemove: removeExtension }
)(Installed);
