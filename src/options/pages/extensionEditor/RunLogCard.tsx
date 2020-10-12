import Card from "react-bootstrap/Card";
import React, { useMemo } from "react";
import { useAsyncState } from "@/hooks/common";
import { getLog } from "@/background/logging";
import { GridLoader } from "react-spinners";
import { Table } from "react-bootstrap";
import { IExtensionPoint } from "@/core";
import moment from "moment";
import { LogEntry } from "@/background/logging";

interface OwnProps {
  extensionPoint: IExtensionPoint;
  extensionId: string;
}

const RunLogCard: React.FunctionComponent<OwnProps> = ({
  extensionPoint,
  extensionId,
}) => {
  const stateFactory = useMemo(
    () => getLog({ extensionPointId: extensionPoint.id, extensionId }),
    [extensionPoint.id, extensionId]
  );
  const [entries, isLoading] = useAsyncState(stateFactory);

  return isLoading ? (
    <Card.Body>
      <GridLoader />
    </Card.Body>
  ) : (
    <Table>
      <thead>
        <tr>
          <td>Timestamp</td>
          <td>Kind</td>
          <td>Message</td>
        </tr>
      </thead>
      <tbody>
        {entries.map((x: LogEntry) => (
          <tr key={x.uuid}>
            <td>{moment(Number.parseInt(x.timestamp, 10)).calendar()}</td>
            <td>Error</td>
            <td>{typeof x.error === "object" ? x.error.message : x.error}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default RunLogCard;
