/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { connect } from "react-redux";
import React, { useContext, useMemo } from "react";
import { groupBy, isEmpty, sortBy } from "lodash";
import { optionsSlice } from "@/options/slices";
import Page from "@/layout/Page";
import { faCubes } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { Card, Col, Row, Table } from "react-bootstrap";
import { ExtensionRef, ResolvedExtension, IExtension } from "@/core";
import "./InstalledPage.scss";
import { uninstallContextMenu } from "@/background/contextMenus";
import { reportError } from "@/telemetry/logging";
import AuthContext from "@/auth/AuthContext";
import { reportEvent } from "@/telemetry/events";
import { reactivate } from "@/background/navigation";
import { Dispatch } from "redux";
import { selectExtensions } from "@/options/selectors";
import NoExtensionsPage from "@/options/pages/installed/NoExtensionsPage";
import RecipeEntry from "@/options/pages/installed/RecipeEntry";
import { OptionsState } from "@/store/extensions";
import { useAsyncState } from "@/hooks/common";
import { resolveDefinitions } from "@/registry/internal";

const { removeExtension } = optionsSlice.actions;

type RemoveAction = (identifier: ExtensionRef) => void;

const InstalledTable: React.FunctionComponent<{
  extensions: ResolvedExtension[];
  onRemove: RemoveAction;
}> = ({ extensions, onRemove }) => {
  const recipeExtensions = useMemo(
    () =>
      sortBy(
        Object.entries(groupBy(extensions, (x) => x._recipe?.id ?? "")),
        ([recipeId]) => (recipeId === "" ? 0 : 1)
      ),
    [extensions]
  );

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

const InstalledPage: React.FunctionComponent<{
  extensions: IExtension[];
  onRemove: RemoveAction;
}> = ({ extensions, onRemove }) => {
  const { flags } = useContext(AuthContext);

  const [resolved] = useAsyncState(
    async () => Promise.all(extensions.map(async (x) => resolveDefinitions(x))),
    [extensions]
  );

  return (
    <Page title="Active Bricks" icon={faCubes}>
      <Row>
        <Col>
          <div className="pb-4">
            {isEmpty(extensions) ? (
              <p>
                Once you&apos;ve activated templates or created your own bricks,
                you&apos;ll be able to manage them here
              </p>
            ) : (
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
                    the{" "}
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
            )}
          </div>
        </Col>
      </Row>
      {isEmpty(extensions) ? (
        <NoExtensionsPage />
      ) : (
        <InstalledTable extensions={resolved} onRemove={onRemove} />
      )}
    </Page>
  );
};

const mapStateToProps = (state: { options: OptionsState }) => ({
  extensions: selectExtensions(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  // IntelliJ doesn't detect use in the props
  onRemove: (ref: ExtensionRef) => {
    reportEvent("ExtensionRemove", {
      extensionId: ref.extensionId,
    });
    // Remove from storage first so it doesn't get re-added in reactivate step below
    dispatch(removeExtension(ref));
    // XXX: also remove remove side panel panels that are already open?
    void uninstallContextMenu(ref).catch((error) => {
      reportError(error);
    });
    void reactivate().catch((error: unknown) => {
      console.warn("Error re-activating content scripts", { error });
    });
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(InstalledPage);
