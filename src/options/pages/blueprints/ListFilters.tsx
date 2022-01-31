import { Col, Nav } from "react-bootstrap";
import React from "react";
import styles from "./ListFilters.module.scss";
import { UseFiltersInstanceProps } from "react-table";
import { UnknownObject } from "@/types";

type ListFiltersProps<D extends UnknownObject> = {
  setAllFilters: UseFiltersInstanceProps<D>["setAllFilters"];
  teamFilters: string[];
};

function ListFilters<D extends UnknownObject>({
  setAllFilters,
  teamFilters,
}: ListFiltersProps<D>) {
  return (
    <Col xs={3} className={styles.filtersCol}>
      <h5>Category Filters</h5>
      <Nav className="flex-column" variant="pills" defaultActiveKey="active">
        <Nav.Item>
          <Nav.Link
            eventKey="active"
            onClick={() => {
              setAllFilters([{ id: "status", value: "Active" }]);
            }}
          >
            Active Blueprints
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="all"
            onClick={() => {
              setAllFilters([]);
            }}
          >
            All Blueprints
          </Nav.Link>
        </Nav.Item>
        <h5 className="mt-3">My Collections</h5>
        <Nav.Item>
          <Nav.Link
            eventKey="personal"
            onClick={() => {
              setAllFilters([
                { id: "sharing.source.label", value: "Personal" },
              ]);
            }}
          >
            Personal Blueprints
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="public"
            onClick={() => {
              setAllFilters([{ id: "sharing.source.label", value: "Public" }]);
            }}
          >
            Public Marketplace Blueprints
          </Nav.Link>
        </Nav.Item>
        {teamFilters.length > 0 && <h5 className="mt-3">Shared with Me</h5>}
        {teamFilters.map((filter) => (
          <Nav.Item key={filter}>
            <Nav.Link
              eventKey={filter}
              onClick={() => {
                setAllFilters([{ id: "sharing.source.label", value: filter }]);
              }}
            >
              {filter} Blueprints
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    </Col>
  );
}

export default ListFilters;
