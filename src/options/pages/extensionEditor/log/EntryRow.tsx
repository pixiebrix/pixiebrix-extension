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
import moment from "moment";
import { ErrorObject } from "serialize-error";
import JSONTree from "react-json-tree";

const theme = {
  // https://github.com/reduxjs/redux-devtools/tree/75322b15ee7ba03fddf10ac3399881e302848874/src/react/themes
  scheme: "google",
  author: "seth wright (http://sethawright.com)",
  base00: "#1d1f21",
  base01: "#282a2e",
  base02: "#373b41",
  base03: "#969896",
  base04: "#b4b7b4",
  base05: "#c5c8c6",
  base06: "#e0e0e0",
  base07: "#ffffff",
  base08: "#CC342B",
  base09: "#F96A38",
  base0A: "#FBA922",
  base0B: "#198844",
  base0C: "#3971ED",
  base0D: "#3971ED",
  base0E: "#A36AC7",
  base0F: "#3971ED",
};

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
    } else if (entry.data?.renderedArgs) {
      return InputDetail;
    } else if (entry.data?.output) {
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
        <td>{moment(Number.parseInt(entry.timestamp, 10)).calendar()}</td>
        <td>{entry.level.toUpperCase()}</td>
        <td>{entry.context.blockId ?? entry.context.serviceId ?? ""}</td>
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
