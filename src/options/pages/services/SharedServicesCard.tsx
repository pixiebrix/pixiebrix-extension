import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import React from "react";
import { RemoteService } from "@/types/contract";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import urljoin from "url-join";
import { GridLoader } from "react-spinners";
import { ServiceConfig } from "@/core";

export interface OrganizationMeta {
  id: string;
  name: string;
}

export interface SanitizedAuth {
  id: string;
  editable: boolean;
  label: string | undefined;
  organization: OrganizationMeta | undefined;
  config: ServiceConfig;
  service: RemoteService;
}

interface OwnProps {
  remoteAuths: SanitizedAuth[];
}

const SharedServicesCard: React.FunctionComponent<OwnProps> = ({
  remoteAuths,
}) => {
  const [serviceUrl] = useAsyncState(getBaseURL);

  return (
    <>
      <Card.Body className="pb-2">
        <p>
          Services made available by your team and/or built-in to PixieBrix.
        </p>
      </Card.Body>
      {remoteAuths ? (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Id</th>
              <th>Team</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {remoteAuths.map((remoteAuth) => (
              <tr key={remoteAuth.id}>
                <td>{remoteAuth.service.config.metadata.name}</td>
                <td>
                  <code>{remoteAuth.service.config.metadata.id}</code>
                </td>
                <td>{remoteAuth.organization?.name ?? "✨ Built-in"}</td>
                <td>{remoteAuth.label}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Card.Body>
          <GridLoader />
        </Card.Body>
      )}
      <Card.Footer>
        {serviceUrl ? (
          <span className="py-3">
            To configure shared services, open the{" "}
            <a
              href={urljoin(serviceUrl, "services")}
              target="_blank"
              rel="noopener noreferrer"
            >
              PixieBrix website
            </a>
          </span>
        ) : (
          <span className="py-3">
            To configure shared services,
            <a href="#" target="_blank" rel="noopener noreferrer">
              create a PixieBrix account
            </a>
          </span>
        )}
      </Card.Footer>
    </>
  );
};

export default SharedServicesCard;
