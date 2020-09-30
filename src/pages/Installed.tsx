import Table from "react-bootstrap/Table";
import isEmpty from "lodash/isEmpty";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import React, { useMemo } from "react";
import extensionPointRegistry from "@/extensionPoints/registry";
import { optionsSlice, OptionsState } from "@/designer/options/slices";
import Button from "react-bootstrap/Button";
import { useToasts } from "react-toast-notifications";
import { PageTitle } from "@/designer/options/layout/Page";
import { useExtensionPermissions } from "@/permissions";
import { BeatLoader, GridLoader } from "react-spinners";
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
import { IExtension, ServiceLocator } from "@/core";
import useExtensionStore from "@/hooks/extensionStore";
import { bindActionCreators } from "redux";
import LazyLocatorFactory from "@/services/locator";

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
      message = `The following services have no configurations: ${services.join(
        ", "
      )}`;
    } else {
      message = `You need to add a configuration for ${services[0]}`;
    }
  } else if (validation.missingConfiguration.length) {
    const services = validation.missingConfiguration.map((x) => x.serviceId);
    message = `
      The following services use configurations that no longer exist: ${services.join(
        ", "
      )}`;
  } else if (validation.multipleAuths.length) {
    const services = validation.multipleAuths.map((x) => x.serviceId);
    message = `Multiple configurations exist for these services, you must select which one to use: ${services.join(
      ", "
    )}`;
  }
  return message;
}

const ExtensionRow: React.FunctionComponent<{
  extension: IExtension;
  onRemove: RemoveAction;
  locator: ServiceLocator;
}> = ({ extension, onRemove, locator }) => {
  const { id, label, extensionPointId } = extension;
  const { addToast } = useToasts();
  const [hasPermissions, requestPermissions] = useExtensionPermissions(
    extension
  );
  const [validation] = useExtensionValidator(locator, extension);

  // console.log(`Status ${extension.id}`, { validation, hasPermissions });

  const statusElt = useMemo(() => {
    if (hasPermissions == null || validation == null) {
      return <BeatLoader />;
    } else if (validation && !validation.valid) {
      return (
        <span className="text-danger">
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
      {/*<td>{active ? "Yes" : "No"}</td>*/}
      <td>{extensionPointRegistry.lookup(extensionPointId).name}</td>
      <td>
        <Link to={`/extensions/${extension.id}`}>{label ?? id}</Link>
      </td>
      <td>{statusElt}</td>
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
  const locator = useMemo(() => {
    const locatorFactory = new LazyLocatorFactory();
    return locatorFactory.getLocator();
  }, []);

  return (
    <div>
      <PageTitle icon={faCubes} title="Active Brix" />

      <Row>
        <Col>
          <div className="pb-4">
            <p>
              Here's a list of brix you currently have installed. You can find
              more to install in the{" "}
              <Link to={"/marketplace"}>Marketplace</Link>
            </p>
          </div>
        </Col>
      </Row>
      <Row>
        <Col xl={9} lg={10} md={12}>
          <Card>
            <Card.Header>Active Brix</Card.Header>
            <Card.Body>
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
                      locator={locator}
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
            </Card.Body>
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

export const WebInstalledContainer: React.FunctionComponent = () => {
  const [state, dispatch] = useExtensionStore();
  const extensions = useMemo(
    () => (state ? selectExtensions(state) : undefined),
    [state]
  );

  // @ts-ignore: YOLO
  const { onRemove } = useMemo(
    // @ts-ignore: YOLO
    () => bindActionCreators({ onRemove: removeExtension }, dispatch),
    [dispatch]
  );

  if (extensions == null) {
    return <GridLoader />;
  }

  return <Installed extensions={extensions} onRemove={onRemove} />;
};

export default connect(
  (state: { options: OptionsState }) => ({
    extensions: selectExtensions(state),
  }),
  { onRemove: removeExtension }
)(Installed);
