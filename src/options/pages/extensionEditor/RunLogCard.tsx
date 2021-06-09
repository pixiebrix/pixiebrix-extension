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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearLog,
  getLog,
  LOG_LEVELS,
  MessageLevel,
  LogEntry,
} from "@/background/logging";
import { GridLoader } from "react-spinners";
import { Table, Form, Pagination, Card, Button } from "react-bootstrap";

import range from "lodash/range";
import { useToasts } from "react-toast-notifications";
import EntryRow from "./log/EntryRow";
import useAsyncEffect from "use-async-effect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons/faSync";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

interface OwnProps {
  initialLevel?: MessageLevel;
  extensionPointId: string;
  extensionId: string;
  perPage?: number;
  refreshInterval?: number;
}

const RunLogCard: React.FunctionComponent<OwnProps> = ({
  extensionPointId,
  extensionId,
  initialLevel = "info",
  perPage = 10,
  refreshInterval = undefined,
}) => {
  const { addToast } = useToasts();

  const context = useMemo(() => ({ extensionPointId, extensionId }), [
    extensionPointId,
    extensionId,
  ]);

  const [hasNew, setHasNew] = useState<number>(0);

  const [{ entries, isLoading }, setLogState] = useState<{
    entries: LogEntry[];
    isLoading: boolean;
  }>({ entries: [], isLoading: true });

  const refresh = useCallback(
    async (isMounted: () => boolean = () => true) => {
      setLogState({ entries: [], isLoading: true });
      const entries = await getLog(context);
      if (!isMounted()) return;
      setLogState({ entries, isLoading: false });
      setHasNew(0);
    },
    [context]
  );

  useAsyncEffect(
    async (isMounted) => {
      await refresh(isMounted);
    },
    [refresh]
  );

  const [page, setPage] = useState(0);
  const [level, setLevel] = useState<MessageLevel>(initialLevel);

  const filteredEntries = useMemo(() => {
    return (entries ?? []).filter(
      // level is coming from the dropdown
      // eslint-disable-next-line security/detect-object-injection
      (x) => LOG_LEVELS[x.level] >= LOG_LEVELS[level]
    );
  }, [level, entries]);

  const [pageEntries, numPages] = useMemo(() => {
    const start = page * perPage;
    const pageEntries = filteredEntries.slice(start, start + perPage);
    return [pageEntries, Math.ceil(filteredEntries.length / perPage)];
  }, [level, page, filteredEntries]);

  const check = useCallback(async () => {
    const newEntries = await getLog(context);
    const filteredNewEntries = (newEntries ?? []).filter(
      // level is coming from the dropdown
      // eslint-disable-next-line security/detect-object-injection
      (x) => LOG_LEVELS[x.level] >= LOG_LEVELS[level]
    );
    setHasNew(Math.max(0, filteredNewEntries.length - filteredEntries.length));
  }, [filteredEntries, level, setHasNew]);

  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(check, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, entries, level]);

  return isLoading ? (
    <Card.Body>
      <GridLoader />
    </Card.Body>
  ) : (
    <>
      <div className="px-3 pt-2">
        <div className="form-inline">
          <Form.Group>
            <Form.Label srOnly>Filter</Form.Label>
            <Form.Control
              size="sm"
              as="select"
              style={{ minWidth: 150 }}
              value={level}
              onChange={(x) => {
                setPage(0);
                setLevel(x.target.value as MessageLevel);
              }}
            >
              {["debug", "info", "warn", "error"].map((x) => (
                <option key={x} value={x}>
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
            {hasNew > 0 && (
              <span className="text-info mr-2">
                {hasNew} new {hasNew > 1 ? "entries" : "entry"}
              </span>
            )}
            <Button
              size="sm"
              variant="info"
              onClick={async () => {
                await refresh();
                addToast("Refreshed the log entries", {
                  appearance: "success",
                  autoDismiss: true,
                });
              }}
            >
              <FontAwesomeIcon icon={faSync} /> Refresh
            </Button>
            <Button
              size="sm"
              disabled={entries.length === 0}
              variant="danger"
              onClick={async () => {
                try {
                  await clearLog(context);
                  addToast("Cleared the log entries for this extension", {
                    appearance: "success",
                    autoDismiss: true,
                  });
                  await refresh();
                } catch (ex) {
                  addToast("Error clearing log entries for extension", {
                    appearance: "error",
                    autoDismiss: true,
                  });
                }
              }}
            >
              <FontAwesomeIcon icon={faTrash} /> Clear
            </Button>
          </Form.Group>
        </div>
      </div>
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
              <td colSpan={4}>
                {entries.length === 0 ? (
                  <span>No log entries</span>
                ) : (
                  <span>There are no log entries at this log level</span>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default RunLogCard;
