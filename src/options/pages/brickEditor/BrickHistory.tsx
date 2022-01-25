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
import Select, { components, OptionProps } from "react-select";
import useFetch from "@/hooks/useFetch";
import { PackageVersion, Package } from "@/types/contract";
import DiffEditor from "@/vendors/DiffEditor";
import objectHash from "object-hash";
import styles from "./BrickHistory.module.scss";
import { UUID } from "@/core";

export interface PackageVersionOption {
  value: string;
  label: string;
  created_at: string;
}

const { Option, SingleValue } = components;

const Content: React.FunctionComponent<{
  data: PackageVersionOption;
}> = ({ data }) => (
  <div className="d-flex align-items-center">
    <span>{data.label}&nbsp;</span>{" "}
    <span className="small text-muted">{data.created_at}</span>
  </div>
);

const CustomSingleValue: React.FunctionComponent<
  OptionProps<PackageVersionOption>
> = (props) => (
  <SingleValue {...props}>
    <Content data={props.data} />
  </SingleValue>
);

const CustomSingleOption: React.FunctionComponent<
  OptionProps<PackageVersionOption>
> = (props) => (
  <Option {...props}>
    <Content data={props.data} />
  </Option>
);

const BrickHistory: React.FunctionComponent<{
  brickId: UUID;
}> = ({ brickId }) => {
  const { data: brick } = useFetch<Package>(`/api/bricks/${brickId}/`);
  const { data: packageVersions } = useFetch<PackageVersion[]>(
    `/api/bricks/${brickId}/versions/`
  );
  const [versionA, setVersionA] = useState(null);
  const [versionB, setVersionB] = useState(null);

  const versionOptions = useMemo(
    () =>
      (packageVersions ?? []).map((packageVersion) => {
        const date = new Date(packageVersion.created_at);
        const formatted_date = `${
          date.getMonth() + 1
        }/${date.getDate()}/${date.getFullYear()}`;
        return {
          value: packageVersion.raw_config,
          label:
            packageVersion.version === brick?.version
              ? `${packageVersion.version} (current)`
              : `${packageVersion.version}`,
          created_at: formatted_date,
        };
      }),
    [packageVersions, brick]
  );

  const currentVersion = useMemo(
    () => versionOptions.find((option) => option.label.includes("current")),
    [versionOptions]
  );

  useEffect(() => {
    setVersionA(currentVersion);
  }, [currentVersion]);

  return (
    <div>
      <div className="p-3">
        <p>
          Compare past versions of this brick by selecting the versions below.
        </p>
        <div className="d-flex justify-content-start">
          <Select
            className={styles.versionSelector}
            placeholder="Select a version"
            options={versionOptions}
            value={versionA}
            onChange={(option) => {
              setVersionA(option);
            }}
            components={{
              Option: CustomSingleOption,
              SingleValue: CustomSingleValue,
            }}
          />
          <Select
            className={styles.versionSelector}
            placeholder="Select a version"
            options={versionOptions}
            onChange={(option) => {
              setVersionB(option);
            }}
            components={{
              Option: CustomSingleOption,
              SingleValue: CustomSingleValue,
            }}
          />
        </div>
      </div>
      {versionA && versionB && (
        <Suspense fallback={<div>Loading history...</div>}>
          <DiffEditor
            value={[versionA?.value ?? "", versionB?.value ?? ""]}
            key={objectHash({ a: versionA, b: versionB })}
            width="100%"
            theme="chrome"
            mode="yaml"
            name={"DIFF_EDITOR_DIV"}
            readOnly
          />
        </Suspense>
      )}
    </div>
  );
};

export default BrickHistory;
