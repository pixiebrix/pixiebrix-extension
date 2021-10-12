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
import { Col, Row, Card } from "react-bootstrap";
import Select from "react-select";
import useFetch from "@/hooks/useFetch";
import { PackageVersion, Package } from "@/types/contract";
import DiffEditor from "@/vendors/DiffEditor";
import objectHash from "object-hash";
import "./BrickHistory.scss";
import { useParams } from "react-router";

const BrickHistory: React.FunctionComponent = () => {
  const { id } = useParams<{ id: string }>();
  const { data: brick } = useFetch<Package>(`/api/bricks/${id}`);
  const { data: packageVersions = [] } = useFetch<PackageVersion[]>(
    `/api/bricks/${brick?.id}/versions/`
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
    setTimeout(() => {
      setVersionA(currentVersion);
    }, 2000);
  }, [currentVersion]);

  return (
    <div>
      <div className="p-3">
        <p>
          Compare past versions of this brick by selecting the versions below.
        </p>
        <div className="d-flex justify-content-start">
          <Select
            className="versionSelector mr-4"
            placeholder="Select a version"
            options={versionOptions.filter((option) => option !== versionB)}
            value={versionA}
            onChange={(option) => {
              setVersionA(option);
            }}
          />
          <Select
            className="versionSelector"
            placeholder="Select a version"
            options={versionOptions.filter((option) => option !== versionA)}
            onChange={(option) => {
              setVersionB(option);
            }}
          />
        </div>
      </div>
      {versionA ? (
        <Suspense fallback={<div>Loading history...</div>}>
          <DiffEditor
            value={[
              versionA ? versionA.value.raw_config : "",
              versionB ? versionB.value.raw_config : "",
            ]}
            key={objectHash({ versionA, versionB, brick, packageVersions })}
            width="100%"
            theme="chrome"
            mode="yaml"
            name="DIFF_EDITOR_DIV"
            readOnly
          />
        </Suspense>
      ) : (
        <div>Loading history...</div>
      )}
    </div>
  );
};

export default BrickHistory;
