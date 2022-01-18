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

import { connect, useSelector } from "react-redux";
import React, { useCallback, useContext } from "react";
import Page from "@/layout/Page";
import { faCubes } from "@fortawesome/free-solid-svg-icons";
import { Link, Redirect, Route } from "react-router-dom";
import { Col, Row } from "react-bootstrap";
import { IExtension, UUID } from "@/core";
import "./InstalledPage.scss";
import {
  reactivateEveryTab,
  uninstallContextMenu,
} from "@/background/messenger/api";
import { reportError } from "@/telemetry/logging";
import AuthContext from "@/auth/AuthContext";
import { reportEvent } from "@/telemetry/events";
import { Dispatch } from "redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useAsyncState } from "@/hooks/common";
import { resolveDefinitions } from "@/registry/internal";
import { getLinkedApiClient } from "@/services/apiClient";
import { CloudExtension } from "@/types/contract";
import { RemoveAction } from "@/options/pages/installed/installedPageTypes";
import ActiveBricksCard from "@/options/pages/installed/ActiveBricksCard";
import useNotifications from "@/hooks/useNotifications";
import { exportBlueprint } from "./exportBlueprint";
import ShareExtensionModal from "@/options/pages/installed/ShareExtensionModal";
import { push } from "connected-react-router";
import ExtensionLogsModal from "./ExtensionLogsModal";
import { RootState } from "@/options/store";
import { LogsContext } from "./installedPageSlice";
import { selectShowLogsContext } from "./installedPageSelectors";
import OnboardingPage from "@/options/pages/installed/OnboardingPage";
import extensionsSlice from "@/store/extensionsSlice";
import { OptionsState } from "@/store/extensionsTypes";
import ShareLinkModal from "./ShareLinkModal";

const { removeExtension } = extensionsSlice.actions;

export const _InstalledPage: React.FunctionComponent<{
  extensions: IExtension[];
  push: (path: string) => void;
  onRemove: RemoveAction;
}> = ({ extensions, onRemove, push }) => {
  const { flags } = useContext(AuthContext);

  const [allExtensions, , cloudError] = useAsyncState(
    async () => {
      const lookup = new Set<UUID>(extensions.map((x) => x.id));
      const { data } = await (await getLinkedApiClient()).get<CloudExtension[]>(
        "/api/extensions/"
      );

      const cloudExtensions = data
        .filter((x) => !lookup.has(x.id))
        .map((x) => ({ ...x, active: false }));

      return [...extensions, ...cloudExtensions];
    },
    [extensions],
    extensions ?? []
  );

  const [resolvedExtensions, , resolveError] = useAsyncState(
    async () =>
      Promise.all(
        allExtensions.map(async (extension) => resolveDefinitions(extension))
      ),
    [allExtensions],
    []
  );

  const showLogsContext = useSelector<RootState, LogsContext>(
    selectShowLogsContext
  );

  const notify = useNotifications();

  const onExportBlueprint = useCallback(
    (extensionIdToExport: UUID) => {
      const extension = allExtensions.find(
        (extension) => extension.id === extensionIdToExport
      );

      if (extension == null) {
        notify.error(
          `Error exporting as blueprint: extension with id ${extensionIdToExport} not found.`
        );
        return;
      }

      exportBlueprint(extension);
    },
    [notify, allExtensions]
  );

  // Guard race condition with load when visiting the URL directly
  const noExtensions =
    extensions.length === 0 &&
    allExtensions != null &&
    allExtensions.length === 0;

  return (
    <Page
      title="Active Bricks"
      icon={faCubes}
      error={cloudError ?? resolveError}
    >
      <Route
        exact
        path="/installed/share/:extensionId"
        render={(routeProps) => {
          // Avoid race condition with load when visiting the URL directly
          if (!allExtensions) {
            return null;
          }

          const toShare = allExtensions.find(
            (x) => x.id === routeProps.match.params.extensionId
          );

          return toShare && !flags.includes("restricted-marketplace") ? (
            <ShareExtensionModal
              extension={toShare}
              onCancel={() => {
                push("/installed");
              }}
            />
          ) : (
            <Redirect to="/installed" />
          );
        }}
      />
      {showLogsContext && (
        <ExtensionLogsModal
          title={showLogsContext.title}
          context={showLogsContext.messageContext}
        />
      )}
      <Row>
        <Col>
          <div className="pb-4">
            {noExtensions ? (
              <p>
                Once you&apos;ve activated blueprints or created your own
                bricks, you&apos;ll be able to manage them here
              </p>
            ) : (
              <p>
                Here&apos;s a list of bricks you currently have activated.{" "}
                {flags.includes("marketplace") ? (
                  <>
                    You can find more to activate in{" "}
                    <Link to={"/blueprints"}>My Blueprints</Link>.
                  </>
                ) : (
                  <>
                    You can find more to activate in the{" "}
                    <a
                      href="https://pixiebrix.com/marketplace/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Marketplace
                    </a>
                    . Or, follow the{" "}
                    <a
                      href="https://docs.pixiebrix.com/quick-start-guide"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Page Editor Quickstart Guide
                    </a>{" "}
                    to create your own.
                  </>
                )}
              </p>
            )}
          </div>
        </Col>
      </Row>
      {noExtensions && <OnboardingPage />}

      {resolvedExtensions?.length > 0 && (
        <ActiveBricksCard
          extensions={resolvedExtensions}
          onRemove={onRemove}
          onExportBlueprint={onExportBlueprint}
        />
      )}
    </Page>
  );
};

const mapStateToProps = (state: { options: OptionsState }) => ({
  extensions: selectExtensions(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  // IntelliJ doesn't detect use in the props
  push: (path: string) => {
    dispatch(push(path));
  },
  onRemove: ({ extensionId }: { extensionId: UUID }) => {
    reportEvent("ExtensionRemove", {
      extensionId,
    });
    // Remove from storage first so it doesn't get re-added in reactivate step below
    dispatch(removeExtension({ extensionId }));
    // XXX: also remove remove side panel panels that are already open?
    void uninstallContextMenu({ extensionId }).catch(reportError);
    reactivateEveryTab();
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(_InstalledPage);
