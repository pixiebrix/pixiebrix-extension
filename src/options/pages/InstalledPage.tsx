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

import Table from "react-bootstrap/Table";
import isEmpty from "lodash/isEmpty";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import React, { useMemo, useState } from "react";
import groupBy from "lodash/groupBy";
import sortBy from "lodash/sortBy";
import extensionPointRegistry from "@/extensionPoints/registry";
import { optionsSlice, OptionsState } from "../slices";
import Button from "react-bootstrap/Button";
import { useToasts } from "react-toast-notifications";
import { PageTitle } from "@/layout/Page";
import { useExtensionPermissions } from "@/permissions";
import { useAsyncEffect } from "use-async-effect";
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
import "./InstalledPage.scss";
import Registry, { RegistryItem } from "@/baseRegistry";
import { uninstallContextMenu } from "@/background/contextMenus";

const { removeExtension } = optionsSlice.actions;

type ExtensionIdentifier = { extensionId: string; extensionPointId: string };

type RemoveAction = (identifier: ExtensionIdentifier) => void;

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

function useRegistry<T extends RegistryItem>(
  registry: Registry<T>,
  id: string
) {
  const [result, setResult] = useState<T>();
  useAsyncEffect(
    async (isMounted) => {
      const result = await registry.lookup(id);
      if (!isMounted) {
        return;
      }
      setResult(result);
    },
    [registry, id]
  );
  return result;
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

  const extensionPoint = useRegistry(extensionPointRegistry, extensionPointId);

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
      <td>{extensionPoint?.name}</td>
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

interface InstalledExtension extends IExtension {
  _recipe: {
    id: string;
    name: string;
  } | null;
}

const InstalledPage: React.FunctionComponent<{
  extensions: InstalledExtension[];
  onRemove: RemoveAction;
}> = ({ extensions, onRemove }) => {
  const recipeExtensions = useMemo(() => {
    return sortBy(
      Object.entries(groupBy(extensions, (x) => x._recipe?.id ?? "")),
      (x) => (x[0] === "" ? 0 : 1)
    );
  }, [extensions]);

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
          <Card className="ActiveBricksCard">
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
              {recipeExtensions.map(([recipeId, xs]) => (
                <tbody key={recipeId}>
                  {recipeId !== "" && (
                    <tr className="ActiveBricksCard__blueprint">
                      <th colSpan={4} className="py-2">
                        {xs[0]._recipe?.name ?? recipeId}
                      </th>
                    </tr>
                  )}
                  {xs.map((extension) => (
                    <ExtensionRow
                      key={extension.id}
                      extension={extension}
                      onRemove={onRemove}
                    />
                  ))}
                </tbody>
              ))}
              {isEmpty(extensions) && (
                <tbody>
                  <tr>
                    <td colSpan={4}>
                      No bricks installed yet. Find some in the{" "}
                      <Link to={"/marketplace"}>Marketplace</Link>
                    </td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                </tbody>
              )}
            </Table>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

InstalledPage.propTypes = {
  extensions: PropTypes.array,
};

function selectExtensions(state: {
  options: OptionsState;
}): InstalledExtension[] {
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
  (dispatch) => ({
    onRemove: (identifier: ExtensionIdentifier) => {
      uninstallContextMenu(identifier).then(() => {
        dispatch(removeExtension(identifier));
      });
    },
  })
)(InstalledPage);
