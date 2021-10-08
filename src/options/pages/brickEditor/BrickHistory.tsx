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
import React, { useEffect, useMemo, useState, Suspense } from "react";
import { Col, Row } from "react-bootstrap";
import Select from "react-select";
import useFetch from "@/hooks/useFetch";
import { PackageVersion, Package } from "@/types/contract";
import DiffEditor from "@/vendors/DiffEditor";

const BrickHistory: React.FunctionComponent<{
  brick: Package;
}> = ({ brick }) => {
  const { data: packageVersions = [] } = useFetch<PackageVersion[]>(
    `/api/bricks/${brick.id}/versions/`
  );
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
    <>
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
        <Col xs={12}>
          <Suspense fallback={<div>Loading history...</div>}>
            <DiffEditor
              value={[
                versionA ? versionA.value.raw_config : "",
                versionB ? versionB.value.raw_config : "",
              ]}
              theme="chrome"
              mode="yaml"
              name="DIFF_EDITOR_DIV"
            />
          </Suspense>
        </Col>
      </Row>
    </>
  );
};

export default BrickHistory;
