/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback } from "react";
import { useToasts } from "react-toast-notifications";
import { v4 as uuidv4 } from "uuid";
import { connect } from "react-redux";
import { optionsSlice } from "@/options/slices";
import { push } from "connected-react-router";
import { useParams } from "react-router";
import { useExtension } from "@/selectors";
import ExtensionPointDetail, { Config } from "./ExtensionPointDetail";
import WorkshopPage from "@/options/pages/extensionEditor/WorkshopPage";
import { reactivate } from "@/background/navigation";
import GridLoader from "react-spinners/GridLoader";

import "./ExtensionEditor.scss";

const { saveExtension } = optionsSlice.actions;

interface OwnProps {
  navigate: (target: string) => void;
  saveExtension: (
    config: Config & { extensionPointId: string; extensionId: string }
  ) => void;
}

interface InstallRouteParams {
  extensionId: null;
  extensionPointId: string;
  tab?: string;
}

interface EditRouteParams {
  extensionPointId: null;
  extensionId: string;
  tab?: string;
}

type RouteParams = InstallRouteParams | EditRouteParams;

const ExtensionEditor: React.FunctionComponent<OwnProps> = ({
  saveExtension,
  navigate,
}) => {
  const { addToast } = useToasts();
  const { extensionPointId, extensionId } = useParams<RouteParams>();
  const { extensionPoint, extensionConfig, isPending } = useExtension(
    extensionPointId ? decodeURIComponent(extensionPointId) : undefined,
    extensionId ? decodeURIComponent(extensionId) : undefined
  );

  const save = useCallback(
    ({ config, label, services, optionsArgs }, { setSubmitting }) => {
      if (!extensionPoint) {
        return;
      }
      try {
        const isNew = !extensionConfig?.id;
        const extensionId = extensionConfig?.id ?? uuidv4();
        saveExtension({
          extensionPointId: extensionPoint.id,
          extensionId,
          config,
          services,
          label,
          optionsArgs,
        });

        const toastMsg = extensionConfig?.id
          ? "Updated brick"
          : "Activated brick";

        addToast(toastMsg, {
          appearance: "success",
          autoDismiss: true,
        });

        if (isNew) {
          navigate(`/workshop/extensions/${extensionId}`);
        }

        void reactivate();
      } finally {
        setSubmitting(false);
      }
    },
    [extensionPoint, extensionConfig, saveExtension, addToast, navigate]
  );

  if (isPending) {
    return <GridLoader />;
  } else if (!extensionPoint) {
    return <WorkshopPage navigate={navigate} />;
  } else {
    return (
      <ExtensionPointDetail
        initialValue={{
          label: extensionConfig?.label,
          config: extensionConfig?.config,
          services: extensionConfig?.services ?? [],
          optionsArgs: extensionConfig?.optionsArgs ?? {},
        }}
        extensionId={extensionId}
        extensionPoint={extensionPoint}
        onSave={save}
      />
    );
  }
};

const mapStateToProps: null = undefined;
const mapDispatchToProps = { saveExtension, navigate: push };

export default connect(mapStateToProps, mapDispatchToProps)(ExtensionEditor);
