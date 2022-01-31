import React from "react";
import { Button } from "react-bootstrap";
import { Installable } from "./blueprintsTypes";
import useInstallableActions from "./useInstallableActions";

type StatusProps = {
  installable: Installable;
};

const Status: React.VFC<StatusProps> = ({ installable }) => {
  const { activate, reinstall } = useInstallableActions(installable);

  return installable.active ? (
    <>
      {installable.hasUpdate ? (
        <Button size="sm" variant="warning" onClick={reinstall}>
          Update
        </Button>
      ) : (
        <div className="text-info py-2">Active</div>
      )}
    </>
  ) : (
    <Button size="sm" variant="info" onClick={activate}>
      Activate
    </Button>
  );
};

export default Status;
