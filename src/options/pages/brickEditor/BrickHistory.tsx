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
import React, { useEffect, useMemo, useState } from "react";
import { Col, Row } from "react-bootstrap";
import Select from "react-select";
import { useParams } from "react-router";
import useFetch from "@/hooks/useFetch";
import { PackageVersion, Package } from "@/types/contract";
import { diff as DiffEditor } from "react-ace";

import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/theme-chrome";

const BrickHistory: React.FunctionComponent = () => {
  const { id } = useParams<{ id: string }>();
  const { data: packageVersions = [] } = useFetch<PackageVersion[]>(
    `/api/bricks/${id}/versions/`
  );
  const { data: brick } = useFetch<Package>(`/api/bricks/${id}`);
  const [versionA, setVersionA] = useState(null);
  const [versionB, setVersionB] = useState(null);

  const versionOptions = useMemo(
    () =>
      packageVersions.map((packageVersion) => ({
        value: packageVersion,
        label:
          packageVersion.version === brick?.version
            ? `${packageVersion.version} (current)`
            : packageVersion.version,
      })),
    [packageVersions, brick]
  );

  const currentVersion = useMemo(
    () =>
      versionOptions.find((option) => option.value.version === brick?.version),
    [versionOptions, brick]
  );

  useEffect(() => {
    setVersionA(currentVersion);
  }, [currentVersion]);

  return (
    <Row>
      <Col xs={12} className="pb-3">
        Compare past versions of this brick by selecting the versions below.
      </Col>
      <Col xs={4}>
        <Select
          placeholder="Select a version"
          options={versionOptions.filter((option) => option !== versionB)}
          value={versionA}
          onChange={(option) => {
            setVersionA(option);
          }}
        />
      </Col>
      <Col xs={4}>
        <Select
          placeholder="Select a version"
          options={versionOptions.filter((option) => option !== versionA)}
          onChange={(option) => {
            setVersionB(option);
          }}
        />
      </Col>
      <Col xs={6}>{versionA?.value.raw_config}</Col>
      <Col xs={6}>{versionB?.value.raw_config}</Col>

      <DiffEditor
        value={["hello world?", "hello world!"]}
        theme="chrome"
        mode="yaml"
        name="diff_editor"
      />
    </Row>
  );
};

export default BrickHistory;
