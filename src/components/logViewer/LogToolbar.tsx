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

import { Button, Form, Pagination } from "react-bootstrap";
import { MessageLevel } from "@/background/logging";
import { range } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faTrash } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { useToasts } from "react-toast-notifications";

const LogToolbar: React.FunctionComponent<{
  level: MessageLevel;
  setLevel: (level: MessageLevel) => void;
  page: number;
  setPage: (page: number) => void;
  numPages: number;
  hasEntries: boolean;
  numNew: number;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}> = ({
  level,
  setLevel,
  setPage,
  page,
  numPages,
  hasEntries,
  numNew,
  clear,
  refresh,
}) => {
  const { addToast } = useToasts();

  return (
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
          {numNew > 0 && (
            <span className="text-info mr-2">
              {numNew} new {numNew > 1 ? "entries" : "entry"}
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
            disabled={!hasEntries}
            variant="danger"
            onClick={async () => {
              try {
                await clear();
                addToast("Cleared the log entries for this extension", {
                  appearance: "success",
                  autoDismiss: true,
                });
                await refresh();
              } catch {
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
  );
};

export default LogToolbar;
