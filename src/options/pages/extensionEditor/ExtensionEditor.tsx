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

import React, { useCallback, useMemo } from "react";
import { uuidv4, validateRegistryId, validateUUID } from "@/types/helpers";
import { connect } from "react-redux";
import { optionsSlice } from "@/options/slices";
import { push } from "connected-react-router";
import { useParams } from "react-router";
import { useExtension } from "@/selectors";
import ExtensionPointDetail from "./ExtensionPointDetail";
import WorkshopPage from "@/options/pages/extensionEditor/WorkshopPage";
import { reactivate } from "@/background/navigation";
import GridLoader from "react-spinners/GridLoader";
import "./ExtensionEditor.scss";
import { RegistryId, UUID } from "@/core";
import { getErrorMessage } from "@/errors";
import useNotifications from "@/hooks/useNotifications";
import { optional } from "@/utils";

const { saveExtension } = optionsSlice.actions;

interface OwnProps {
  navigate: (target: string) => void;
  saveExtension: typeof saveExtension;
}

type InstallRouteParams = {
  // Leave key in to make call to useExtension more straight-forward
  extensionId: undefined;
  extensionPointId: RegistryId;
  tab?: string;
};

type EditRouteParams = {
  extensionId: RegistryId;
  extensionPointId: UUID;
  tab?: string;
};

type RouteParams = InstallRouteParams | EditRouteParams;

const safeDecodeURIComponent = optional(decodeURIComponent);

const ExtensionEditor: React.FunctionComponent<OwnProps> = ({
  saveExtension,
  navigate,
}) => {
  const notify = useNotifications();
  const params = useParams<RouteParams>();

  const parsed = useMemo(
    () => ({
      extensionPointId: validateRegistryId(
        safeDecodeURIComponent(params.extensionPointId)
      ),
      extensionId: validateUUID(safeDecodeURIComponent(params.extensionId)),
    }),
    [params.extensionPointId, params.extensionId]
  );

  const { extensionPoint, extensionConfig, isPending, error } = useExtension(
    parsed.extensionPointId,
    parsed.extensionId
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
          id: extensionId,
          extensionId,
          extensionPointId: extensionPoint.id,
          config,
          services,
          label,
          optionsArgs,
        });

        notify.success(
          extensionConfig?.id ? "Updated brick" : "Activated brick"
        );

        if (isNew) {
          navigate(`/workshop/extensions/${extensionId}`);
        }

        void reactivate();
      } finally {
        setSubmitting(false);
      }
    },
    [extensionPoint, extensionConfig, saveExtension, notify, navigate]
  );

  if (error) {
    return (
      <div className="text-danger">
        Error loading workshop: {getErrorMessage(error)}
      </div>
    );
  }

  if (isPending) {
    return <GridLoader />;
  }

  if (!extensionPoint) {
    return <WorkshopPage navigate={navigate} />;
  }

  return (
    <ExtensionPointDetail
      initialValue={{
        label: extensionConfig?.label ?? "",
        config: extensionConfig?.config ?? {},
        services: extensionConfig?.services ?? [],
        optionsArgs: extensionConfig?.optionsArgs ?? {},
      }}
      extensionId={parsed.extensionId}
      extensionPoint={extensionPoint}
      onSave={save}
    />
  );
};

const mapStateToProps: null = undefined;
const mapDispatchToProps = { saveExtension, navigate: push };

export default connect(mapStateToProps, mapDispatchToProps)(ExtensionEditor);
