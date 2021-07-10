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

import React, { useMemo, useState } from "react";
import { LogEntry } from "@/background/logging";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCaretDown,
  faCaretRight,
  faCheck,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { ErrorObject } from "serialize-error";
import JSONTree from "react-json-tree";
import { jsonTreeTheme as theme } from "@/themes/light";
import { ContextError } from "@/errors";
import { isErrorObject } from "@/utils";
import { InputValidationError } from "@/blocks/errors";
import { Col, Row } from "react-bootstrap";
import { AxiosError, AxiosRequestConfig } from "axios";
import { useAsyncState } from "@/hooks/common";
import { isAbsoluteURL } from "@/hooks/fetch";
import urljoin from "url-join";
import { browser } from "webextension-polyfill-ts";
import { getReasonPhrase } from "http-status-codes";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
});

function getRootCause(error: ErrorObject): ErrorObject {
  if (error.name === "ContextError" && (error as ContextError).cause != null) {
    return getRootCause(error.cause as ErrorObject);
  }
  return error;
}

function getAbsoluteUrl({ url, baseURL }: AxiosRequestConfig): string {
  return isAbsoluteURL(url) ? url : urljoin(baseURL, url);
}

function tryParse(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      // If payload is JSON, parse it for easier reading
      return JSON.parse(value);
    } catch {
      // NOP
    }
  }
  return value;
}

function getHumanReadableStatus(code: string | number): string {
  try {
    return getReasonPhrase(code);
  } catch {
    return "Unknown error code";
  }
}

const NetworkErrorDetail: React.FunctionComponent<{ error: AxiosError }> = ({
  error,
}) => {
  const absoluteUrl = useMemo(() => getAbsoluteUrl(error.config), [
    error.config,
  ]);

  const [hasPermissions] = useAsyncState<boolean | undefined>(async () => {
    if (browser.permissions?.contains) {
      return await browser.permissions.contains({
        origins: [absoluteUrl],
      });
    }
  }, [absoluteUrl]);

  const cleanConfig = useMemo(() => {
    const { data, ...rest } = error.config;
    return {
      ...rest,
      data: tryParse(data),
    };
  }, [error.config]);

  const cleanResponse = useMemo(() => {
    if (error.response) {
      const { request, config, data, ...rest } = error.response;
      // don't include request, since we're showing it the other column
      return {
        ...rest,
        data: tryParse(data),
      };
    }
  }, [error.response]);

  const status = error.response?.status;

  return (
    <Row>
      <Col>
        <span>Response</span>
        {hasPermissions === false && (
          <div className="text-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} /> PixieBrix does not
            have permission to access {absoluteUrl}
          </div>
        )}
        {hasPermissions === true && (
          <div className="text-info">
            <FontAwesomeIcon icon={faCheck} /> PixieBrix has permission to
            access {absoluteUrl}
          </div>
        )}
        {status && (
          <div>
            Status: {status} &mdash; {getHumanReadableStatus(status)}
          </div>
        )}
        {cleanResponse == null ? (
          <div>
            <div>PixieBrix did not receive a response. Possible causes:</div>
            <ul>
              <li>
                Your browser or another extension blocked the request. Check
                that PixieBrix has permission to the access the host
              </li>
              <li>The remote server did not respond. Try the request again</li>
            </ul>
          </div>
        ) : (
          <JSONTree hideRoot data={cleanResponse} theme={theme} invertTheme />
        )}
      </Col>
      <Col>
        <span>Request Config</span>
        <JSONTree hideRoot data={cleanConfig} theme={theme} invertTheme />
      </Col>
    </Row>
  );
};

const InputValidationDetail: React.FunctionComponent<{
  error: InputValidationError;
}> = ({ error }) => {
  return (
    <Row>
      <Col>
        <span>Errors</span>
        <ul>
          {error.errors.map((x) => (
            <li key={`${x.keywordLocation}-${x.error}`}>
              {x.keywordLocation}: {x.error}
            </li>
          ))}
        </ul>
      </Col>
      <Col>
        <span>Rendered Args</span>
        <JSONTree hideRoot data={error.input} theme={theme} invertTheme />
      </Col>
      <Col>
        <span>Schema</span>
        <JSONTree hideRoot data={error.schema} theme={theme} invertTheme />
      </Col>
    </Row>
  );
};

const ErrorDetail: React.FunctionComponent<{ entry: LogEntry }> = ({
  entry,
}) => {
  const detail = useMemo(() => {
    if (isErrorObject(entry.error)) {
      const rootCause = getRootCause(entry.error);
      if (rootCause.name === "InputValidationError") {
        return (
          <InputValidationDetail
            error={(rootCause as unknown) as InputValidationError}
          />
        );
      } else if (rootCause.isAxiosError) {
        return (
          <NetworkErrorDetail error={(rootCause as unknown) as AxiosError} />
        );
      }
      return entry.error.stack;
    }
    return entry.error.toString();
  }, [entry.error]);

  return <div style={{ whiteSpace: "pre-wrap" }}>{detail}</div>;
};

const InputDetail: React.FunctionComponent<{ entry: LogEntry }> = ({
  entry,
}) => {
  return (
    <Row>
      <Col>
        <span>Template</span>
        <JSONTree
          hideRoot
          data={entry.data.template}
          theme={theme}
          invertTheme
        />
      </Col>
      <Col>
        <span>Context</span>
        <JSONTree
          hideRoot
          data={entry.data.templateContext}
          theme={theme}
          invertTheme
        />
      </Col>
      <Col>
        <span>Rendered Args</span>
        <JSONTree
          hideRoot
          data={entry.data.renderedArgs}
          theme={theme}
          invertTheme
        />
      </Col>
    </Row>
  );
};

const OutputDetail: React.FunctionComponent<{ entry: LogEntry }> = ({
  entry,
}) => {
  return (
    <Row>
      <Col>
        {entry.data.outputKey && <code>{entry.data.outputKey}</code>}
        <JSONTree data={entry.data.output} theme={theme} invertTheme />
      </Col>
    </Row>
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
        <td>{dateFormat.format(new Date(Number(entry.timestamp)))}</td>
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
