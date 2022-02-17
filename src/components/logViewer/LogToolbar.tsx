/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { Form } from "react-bootstrap";
import type { MessageLevel } from "@/background/logging";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faTrash } from "@fortawesome/free-solid-svg-icons";
import React, { useCallback } from "react";
import { useToasts } from "react-toast-notifications";
import AsyncButton from "@/components/AsyncButton";
import Pagination from "@/components/pagination/Pagination";

const LogToolbar: React.FunctionComponent<{
  level: MessageLevel;
  levelOptions?: MessageLevel[];
  setLevel: (level: MessageLevel) => void;
  page: number;
  setPage: (page: number) => void;
  numPages: number;
  hasEntries: boolean;
  numNew: number;
  clear: () => void;
  refresh: () => void;
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
  // Don't support "trace" by default
  levelOptions = ["debug", "info", "warn", "error"],
}) => {
  const { addToast } = useToasts();

  const onClear = () => {
    try {
      clear();
      addToast("Cleared the log entries for this extension", {
        appearance: "success",
        autoDismiss: true,
      });
    } catch {
      addToast("Error clearing log entries for extension", {
        appearance: "error",
        autoDismiss: true,
      });
    }
  };

  const onRefresh = useCallback(() => {
    refresh();
    addToast("Refreshed the log entries", {
      appearance: "success",
      autoDismiss: true,
    });
  }, [refresh, addToast]);

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
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level.toUpperCase()}
              </option>
            ))}
          </Form.Control>
        </Form.Group>
        <Form.Group className="ml-4">
          {numPages > 0 && (
            <Pagination page={page} numPages={numPages} setPage={setPage} />
          )}
        </Form.Group>
        <Form.Group className="ml-auto">
          {numNew > 0 && (
            <span className="text-info mr-2">
              {numNew} new {numNew > 1 ? "entries" : "entry"}
            </span>
          )}
          <AsyncButton size="sm" variant="info" onClick={onRefresh}>
            <FontAwesomeIcon icon={faSync} /> Refresh
          </AsyncButton>
          <AsyncButton
            size="sm"
            disabled={!hasEntries}
            variant="danger"
            onClick={onClear}
          >
            <FontAwesomeIcon icon={faTrash} /> Clear
          </AsyncButton>
        </Form.Group>
      </div>
    </div>
  );
};

export default LogToolbar;
