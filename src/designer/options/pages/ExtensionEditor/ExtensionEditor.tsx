import React, { useCallback } from "react";
import { useToasts } from "react-toast-notifications";
import { v4 as uuidv4 } from "uuid";
import { connect } from "react-redux";
import { optionsSlice } from "@/designer/options/slices";
import { push } from "connected-react-router";
import { useParams } from "react-router";
import { useExtension } from "@/selectors";
import ExtensionPointDetail, { Config } from "./ExtensionPointDetail";
import ExtensionPointCreate from "@/designer/options/pages/ExtensionEditor/ExtensionPointCreate";

const { saveExtension } = optionsSlice.actions;

interface OwnProps {
  navigate: (target: string) => void;
  saveExtension: (
    config: Config & { extensionPointId: string; extensionId: string }
  ) => void;
}

interface RouteParams {
  extensionPointId: string | null;
  extensionId: string;
}

const ExtensionEditor: React.FunctionComponent<OwnProps> = ({
  saveExtension,
  navigate,
}) => {
  const { addToast } = useToasts();
  const { extensionPointId, extensionId } = useParams<RouteParams>();
  const { extensionPoint, extensionConfig } = useExtension(
    extensionPointId ? decodeURIComponent(extensionPointId) : undefined,
    extensionId
  );

  const save = useCallback(
    ({ config, label, services }) => {
      if (!extensionPoint) return;
      const extensionId = extensionConfig?.id ?? uuidv4();
      saveExtension({
        extensionPointId: extensionPoint.id,
        extensionId,
        config,
        services,
        label,
      });
      const toastMsg = extensionConfig?.id
        ? "Updated block"
        : "Installed block";
      addToast(toastMsg, {
        appearance: "success",
        autoDismiss: true,
      });
    },
    [extensionPoint, extensionConfig, saveExtension, addToast]
  );

  if (!extensionPoint) {
    return <ExtensionPointCreate navigate={navigate} />;
  } else {
    return (
      <ExtensionPointDetail
        saveCaption={extensionConfig ? "Update Brick" : "Attach Brick"}
        initialValue={{
          label: extensionConfig?.label,
          config: extensionConfig?.config,
          services: extensionConfig?.services ?? [],
        }}
        extensionPoint={extensionPoint}
        onSave={save}
      />
    );
  }
};

export default connect(undefined, { saveExtension, navigate: push })(
  ExtensionEditor
);
