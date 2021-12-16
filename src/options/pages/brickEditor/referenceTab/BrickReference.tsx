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
import {
  Col,
  Container,
  Form,
  InputGroup,
  ListGroup,
  Row,
} from "react-bootstrap";
import { IBlock, IService } from "@/core";
import Fuse from "fuse.js";
import { sortBy } from "lodash";
import styles from "./BrickReference.module.scss";
import GridLoader from "react-spinners/GridLoader";
import BrickDetail from "./BrickDetail";
import { ReferenceEntry } from "@/options/pages/brickEditor/brickEditorTypes";
import BlockResult from "./BlockResult";
import { isOfficial } from "@/blocks/util";
import { useAsyncState } from "@/hooks/common";
import { find } from "@/registry/localRegistry";
import { brickToYaml } from "@/utils/objToYaml";
import { useGetOrganizationsQuery } from "@/services/api";

const BrickReference: React.FunctionComponent<{
  bricks: ReferenceEntry[];
  initialSelected?: ReferenceEntry;
}> = ({ bricks, initialSelected }) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReferenceEntry>(initialSelected);
  const { data: organizations = [] } = useGetOrganizationsQuery();

  const sortedBricks = useMemo(
    () =>
      sortBy(
        bricks ?? [],
        (x) => (isOfficial(x.id) ? 0 : 1),
        (x) => x.name
      ),
    [bricks]
  );

  useEffect(() => {
    if (sortedBricks.length > 0 && selected == null) {
      setSelected(sortedBricks[0]);
    }
  }, [sortedBricks, selected, setSelected]);

  const [brickConfig, isBrickConfigLoading] = useAsyncState(async () => {
    if (!selected?.id) {
      return null;
    }

    const brickPackage = await find(selected.id);
    if (brickPackage?.config) {
      delete brickPackage.config.sharing;
      return brickToYaml(brickPackage.config);
    }

    return null;
  }, [selected]);

  const fuse: Fuse<IBlock | IService> = useMemo(
    () =>
      new Fuse(sortedBricks, {
        // Prefer name, then id
        keys: ["name", "id"],
      }),
    [sortedBricks]
  );

  const results = useMemo(() => {
    let matches =
      query.trim() === ""
        ? sortedBricks
        : fuse.search(query).map((x) => x.item);

    // If a brick is selected, have it show up at the top of the list
    if (selected && selected.id === initialSelected?.id) {
      matches = [selected, ...matches.filter((x) => x.id !== selected.id)];
    }

    return matches.slice(0, 10);
  }, [selected, initialSelected, query, fuse, sortedBricks]);

  return (
    <Container className="h-100" fluid>
      <Row className="h-100">
        <Col md={4} className="h-100 px-0">
          <InputGroup className="mr-sm-2">
            <InputGroup.Prepend>
              <InputGroup.Text>Search</InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              id="query"
              placeholder="Start typing to find results"
              value={query}
              onChange={({ target }) => {
                setQuery(target.value);
              }}
            />
          </InputGroup>
          <ListGroup className={styles.blockResults}>
            {results.map((result) => (
              <BlockResult
                key={result.id}
                block={result}
                active={selected?.id === result.id}
                onSelect={() => {
                  setSelected(result);
                }}
                organizations={organizations}
              />
            ))}
          </ListGroup>
        </Col>
        <Col md={8} className={styles.detailColumn}>
          {selected ? (
            <BrickDetail
              brick={selected}
              brickConfig={brickConfig}
              isBrickConfigLoading={isBrickConfigLoading}
            />
          ) : (
            <div>
              <GridLoader />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default BrickReference;
