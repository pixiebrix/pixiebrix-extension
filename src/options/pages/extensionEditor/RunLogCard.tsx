import Card from "react-bootstrap/Card";
import React, { useMemo, useState } from "react";
import { useAsyncState } from "@/hooks/common";
import { getLog } from "@/background/logging";
import { GridLoader } from "react-spinners";
import { Table } from "react-bootstrap";
import { IExtensionPoint } from "@/core";
import moment from "moment";
import { LogEntry } from "@/background/logging";
import { ErrorObject } from "serialize-error";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";

interface OwnProps {
  extensionPoint: IExtensionPoint;
  extensionId: string;
}

const EntryRow: React.FunctionComponent<{ entry: LogEntry }> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const expandable = typeof entry.error === "object" && entry.error;

  return (
    <>
      <tr onClick={() => setExpanded(!expanded)}>
        <td>
          {expandable ? (
            <span>
              {expanded ? (
                <FontAwesomeIcon icon={faCaretDown} />
              ) : (
                <FontAwesomeIcon icon={faCaretRight} />
              )}
            </span>
          ) : (
            ""
          )}
        </td>
        <td>{moment(Number.parseInt(entry.timestamp, 10)).calendar()}</td>
        <td>{entry.level.toUpperCase()}</td>
        <td>{entry.context.blockId ?? entry.context.serviceId ?? ""}</td>
        <td>{entry.message}</td>
      </tr>
      {expanded && expandable && (
        <tr>
          <td>&nbsp;</td>
          <td colSpan={4}>
            <div style={{ whiteSpace: "pre-wrap" }}>
              {(entry.error as ErrorObject).stack}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

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
    <Table responsive>
      <thead>
        <tr>
          <th>&nbsp;</th>
          <th>Timestamp</th>
          <th>Kind</th>
          <th>Block/Service</th>
          <th className="w-100">Message/Error</th>
        </tr>
      </thead>
      <tbody>
        {(entries ?? []).map((x: LogEntry) => (
          <EntryRow entry={x} key={x.uuid} />
        ))}
      </tbody>
    </Table>
  );
};

export default RunLogCard;
