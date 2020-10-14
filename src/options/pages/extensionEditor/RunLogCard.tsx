import React, { useMemo, useState } from "react";
import { useAsyncState } from "@/hooks/common";
import {
  clearLog,
  getLog,
  LOG_LEVELS,
  MessageLevel,
} from "@/background/logging";
import { GridLoader } from "react-spinners";
import { Table, Form, Pagination, Card, Button } from "react-bootstrap";
import { IExtensionPoint } from "@/core";
import moment from "moment";
import { LogEntry } from "@/background/logging";
import { ErrorObject } from "serialize-error";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import range from "lodash/range";
import { useToasts } from "react-toast-notifications";

interface OwnProps {
  extensionPoint: IExtensionPoint;
  extensionId: string;
  perPage?: number;
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
  perPage = 10,
}) => {
  const { addToast } = useToasts();

  const [context, stateFactory] = useMemo(() => {
    const context = { extensionPointId: extensionPoint.id, extensionId };
    return [context, getLog(context)];
  }, [extensionPoint.id, extensionId]);
  const [entries, isLoading] = useAsyncState(stateFactory);
  const [page, setPage] = useState(0);
  const [level, setLevel] = useState<MessageLevel>("info");
  const [cleared, setCleared] = useState(false);

  const [pageEntries, numPages] = useMemo(() => {
    const start = page * perPage;
    const filteredEntries = cleared
      ? []
      : (entries ?? []).filter((x) => LOG_LEVELS[x.level] >= LOG_LEVELS[level]);
    const pageEntries = filteredEntries.slice(start, start + perPage);
    return [pageEntries, Math.ceil(filteredEntries.length / perPage)];
  }, [level, page, entries, cleared]);

  return isLoading ? (
    <Card.Body>
      <GridLoader />
    </Card.Body>
  ) : (
    <>
      {entries.length > 0 && (
        <div className="px-3 pt-2">
          <Form inline>
            <Form.Group>
              <Form.Label srOnly>Filter</Form.Label>
              <Form.Control
                size="sm"
                as="select"
                style={{ minWidth: 150 }}
                onChange={(x) => {
                  setPage(0);
                  setLevel(x.target.value as MessageLevel);
                }}
              >
                {["trace", "debug", "info", "warn", "error"].map((x) => (
                  <option key={x} value={x} selected={level === x}>
                    {x.toUpperCase()}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
            <Form.Group className="ml-4">
              {numPages ? (
                <Pagination className="my-0">
                  {range(numPages).map((x) => (
                    <Pagination.Item
                      key={x}
                      active={x === page}
                      onClick={() => setPage(x)}
                    >
                      {x + 1}
                    </Pagination.Item>
                  ))}
                </Pagination>
              ) : null}
            </Form.Group>
            <Form.Group className="ml-auto">
              <Button
                size="sm"
                disabled={cleared || entries.length === 0}
                variant="danger"
                onClick={async () => {
                  await clearLog(context);
                  addToast("Cleared the log entries for this extension", {
                    appearance: "success",
                    autoDismiss: true,
                  });
                  setCleared(true);
                }}
              >
                Clear Log
              </Button>
            </Form.Group>
          </Form>
        </div>
      )}
      <Table responsive>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Block/Service</th>
            <th className="w-100">Message/Error</th>
          </tr>
        </thead>
        <tbody>
          {pageEntries.map((x: LogEntry) => (
            <EntryRow entry={x} key={x.uuid} />
          ))}
          {pageEntries.length === 0 && (
            <tr>
              <td>&nbsp;</td>
              <td colSpan={4}>No log entries found</td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default RunLogCard;
