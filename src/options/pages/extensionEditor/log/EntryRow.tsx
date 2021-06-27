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

import React, { useMemo, useState } from "react";
import { LogEntry } from "@/background/logging";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { ErrorObject } from "serialize-error";
import JSONTree from "react-json-tree";
import { jsonTreeTheme as theme } from "@/themes/light";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

const ErrorDetail: React.FunctionComponent<{ entry: LogEntry }> = ({
  entry,
}) => {
  const error = entry.error as ErrorObject;
  return <div style={{ whiteSpace: "pre-wrap" }}>{error.stack}</div>;
};

const InputDetail: React.FunctionComponent<{ entry: LogEntry }> = ({
  entry,
}) => {
  return (
    <div className="row">
      <div className="col">
        <span>Template</span>
        <JSONTree
          hideRoot
          data={entry.data.template}
          theme={theme}
          invertTheme
        />
      </div>
      <div className="col">
        <span>Context</span>
        <JSONTree
          hideRoot
          data={entry.data.templateContext}
          theme={theme}
          invertTheme
        />
      </div>
      <div className="col">
        <span>Rendered Args</span>
        <JSONTree
          hideRoot
          data={entry.data.renderedArgs}
          theme={theme}
          invertTheme
        />
      </div>
    </div>
  );
};

const OutputDetail: React.FunctionComponent<{ entry: LogEntry }> = ({
  entry,
}) => {
  return (
    <div className="row">
      <div className="col">
        {entry.data.outputKey && <code>{entry.data.outputKey}</code>}
        <JSONTree data={entry.data.output} theme={theme} invertTheme />
      </div>
    </div>
  );
};

const EntryRow: React.FunctionComponent<{ entry: LogEntry }> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);

  const Detail = useMemo(() => {
    if (typeof entry.error === "object" && entry.error) {
      return ErrorDetail;
    } else if (entry.data?.renderedArgs != null) {
      return InputDetail;
    } else if (entry.data?.output != null) {
      return OutputDetail;
    } else {
      return null;
    }
  }, [entry]);

  const expandable = !!Detail;

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: expandable ? "pointer" : "" }}
      >
        <td>
          {expandable && (
            <span>
              <FontAwesomeIcon icon={expanded ? faCaretDown : faCaretRight} />
            </span>
          )}
        </td>
        <td>{dateFormat.format(new Date(entry.timestamp))}</td>
        <td>{entry.level.toUpperCase()}</td>
        <td>{entry.context?.blockId ?? entry.context?.serviceId ?? ""}</td>
        <td>{entry.message}</td>
      </tr>
      {expanded && expandable && (
        <tr>
          <td>&nbsp;</td>
          <td colSpan={4}>
            <Detail entry={entry} />
          </td>
        </tr>
      )}
    </>
  );
};

export default EntryRow;
