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

import { connect } from "react-redux";
import PropTypes from "prop-types";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { groupBy, sortBy, isEmpty } from "lodash";
import { optionsSlice, OptionsState } from "../slices";
import { useToasts } from "react-toast-notifications";
import { PageTitle } from "@/layout/Page";
import { useExtensionPermissions } from "@/permissions";
import { BeatLoader } from "react-spinners";
import {
  faCheck,
  faCubes,
  faExclamation,
  faCaretRight,
  faCaretDown,
  faExternalLinkAlt,
  faClipboardCheck,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import { Row, Col, Card, Table, Button } from "react-bootstrap";
import {
  ExtensionValidationResult,
  useExtensionValidator,
} from "@/validators/generic";
import { IExtension } from "@/core";
import "./InstalledPage.scss";
import { uninstallContextMenu } from "@/background/contextMenus";
import { reportError } from "@/telemetry/logging";
import AuthContext from "@/auth/AuthContext";
import { reportEvent } from "@/telemetry/events";
import { reactivate } from "@/background/navigation";
import cx from "classnames";
import { Dispatch } from "redux";
import {
  InstalledExtension,
  selectInstalledExtensions,
} from "@/options/selectors";
import { useTitle } from "@/hooks/title";

const { removeExtension } = optionsSlice.actions;

type ExtensionIdentifier = { extensionId: string; extensionPointId: string };

type RemoveAction = (identifier: ExtensionIdentifier) => void;

function validationMessage(validation: ExtensionValidationResult) {
  let message = "Invalid Configuration";
  if (validation.notConfigured.length > 0) {
    const services = validation.notConfigured.map((x) => x.serviceId);
    if (services.length > 1) {
      message = `You need to select configurations for ${services.join(", ")}`;
    } else {
      message = `You need to select a configuration for ${services[0]}`;
    }
  } else if (validation.missingConfiguration.length > 0) {
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

const RecipeEntry: React.FunctionComponent<{
  recipeId: string;
  extensions: InstalledExtension[];
  onRemove: RemoveAction;
}> = ({ recipeId, extensions, onRemove }) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const { addToast } = useToasts();

  const isDeployment = extensions.every((x) => x._deployment != null);

  const removeMany = useCallback(
    async (extensions: InstalledExtension[], name: string) => {
      try {
        for (const { id: extensionId, extensionPointId } of extensions) {
          onRemove({ extensionId, extensionPointId });
        }
        addToast(`Uninstalled ${name}`, {
          appearance: "success",
          autoDismiss: true,
        });
      } catch (error) {
        reportError(error);
      }
    },
    [addToast, onRemove]
  );

  return (
    <tbody key={recipeId}>
      {recipeId !== "" && (
        <tr
          className={cx("ActiveBricksCard__blueprint", { isDeployment })}
          onClick={() => setExpanded((prev: boolean) => !prev)}
        >
          <th>
            {!isDeployment && (
              <FontAwesomeIcon
                icon={expanded ? faCaretDown : faCaretRight}
                onClick={() => setExpanded((prev: boolean) => !prev)}
              />
            )}
          </th>
          {isDeployment ? (
            <>
              <th className="py-2">
                {extensions[0]._recipe?.name ?? recipeId}
              </th>
              <th className="py-2">
                <FontAwesomeIcon icon={faCheck} /> Managed
              </th>
            </>
          ) : (
            <th colSpan={2} className="py-2">
              {extensions[0]._recipe?.name ?? recipeId}
            </th>
          )}
          <th>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                removeMany(extensions, extensions[0]._recipe?.name)
              }
            >
              Uninstall
            </Button>
          </th>
        </tr>
      )}
      {expanded &&
        !isDeployment &&
        extensions.map((extension) => (
          <ExtensionRow
            key={extension.id}
            extension={extension}
            onRemove={onRemove}
          />
        ))}
    </tbody>
  );
};

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
      <td>&nbsp;</td>
      <td>
        <Link to={`/workshop/extensions/${id}`}>{label ?? id}</Link>
      </td>
      {/*<td>2 weeks</td>*/}
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

const InstalledTable: React.FunctionComponent<{
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
    <Row>
      <Col xl={9} lg={10} md={12}>
        <Card className="ActiveBricksCard">
          <Card.Header>Active Bricks</Card.Header>
          <Table>
            <thead>
              <tr>
                <th>&nbsp;</th>
                <th>Name</th>
                {/*<th>Last Used</th>*/}
                <th>Status</th>
                <th>Uninstall</th>
              </tr>
            </thead>
            {recipeExtensions.map(([recipeId, xs]) => (
              <RecipeEntry
                key={recipeId}
                recipeId={recipeId}
                extensions={xs}
                onRemove={onRemove}
              />
            ))}
          </Table>
        </Card>
      </Col>
    </Row>
  );
};

const EmptyPage: React.FunctionComponent = () => {
  return (
    <>
      <Row>
        <Col className="VideoCard">
          <Card>
            <Card.Header>Activate Bricks</Card.Header>
            <Card.Body>
              <Row>
                <Col>
                  <h4>Activate an Official Template</h4>
                  <p>
                    <span className="text-primary">
                      The easiest way to start using PixieBrix!
                    </span>{" "}
                    Activate a pre-made template from the Templates page.
                  </p>
                  <Link to={"/templates"} className="btn btn-info">
                    View Templates&nbsp;
                    <FontAwesomeIcon icon={faClipboardCheck} />
                  </Link>
                </Col>
                <Col>
                  <h4>Create your Own</h4>
                  <p>
                    Follow the Quickstart Guide in our documentation area to
                    start creating your own bricks in minutes.
                  </p>
                  <a
                    className="btn btn-info"
                    href="https://docs.pixiebrix.com/quick-start-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Quickstart Guide&nbsp;
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                  </a>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col className="VideoCard mt-3">
          <Card>
            <Card.Header>Video Tour</Card.Header>
            <Card.Body className="mx-auto">
              <div>
                <iframe
                  src="https://player.vimeo.com/video/514828533"
                  width="640"
                  height="400"
                  frameBorder="0"
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

const InstalledPage: React.FunctionComponent<{
  extensions: InstalledExtension[];
  onRemove: RemoveAction;
}> = ({ extensions, onRemove }) => {
  useTitle("Active Bricks");

  const { flags } = useContext(AuthContext);

  return (
    <div>
      <PageTitle icon={faCubes} title="Active Bricks" />

      <Row>
        <Col>
          <div className="pb-4">
            {!isEmpty(extensions) ? (
              <p>
                Here&apos;s a list of bricks you currently have activated.{" "}
                {flags.includes("marketplace") ? (
                  <>
                    You can find more to activate in the{" "}
                    <Link to={"/marketplace"}>Marketplace</Link>
                  </>
                ) : (
                  <>
                    You can find more to activate on the{" "}
                    <Link to={"/templates"}>Templates</Link> page. Or, follow
                    the
                    <a
                      href="https://docs.pixiebrix.com/quick-start-guide"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Page Editor Quickstart Guide
                    </a>{" "}
                    to create your own
                  </>
                )}
              </p>
            ) : (
              <p>
                Once you&apos;ve activated templates or created your own bricks,
                you&apos;ll be able to manage them here
              </p>
            )}
          </div>
        </Col>
      </Row>
      {!isEmpty(extensions) ? (
        <InstalledTable extensions={extensions} onRemove={onRemove} />
      ) : (
        <EmptyPage />
      )}
    </div>
  );
};

InstalledPage.propTypes = {
  extensions: PropTypes.array,
};

const mapStateToProps = (state: { options: OptionsState }) => ({
  extensions: selectInstalledExtensions(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onRemove: (identifier: ExtensionIdentifier) => {
    reportEvent("ExtensionRemove", {
      extensionId: identifier.extensionId,
    });
    // Remove from storage first so it doesn't get re-added in reactivate step below
    dispatch(removeExtension(identifier));
    uninstallContextMenu(identifier).catch(() => {
      // noop because this is expected to error for non-context menus
    });
    reactivate().catch((error) => {
      console.warn("Error re-activating content scripts", { error });
    });
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(InstalledPage);
