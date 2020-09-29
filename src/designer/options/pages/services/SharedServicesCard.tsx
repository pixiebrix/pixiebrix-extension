import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import React from "react";
import { useFetch } from "@/hooks/fetch";
import { ConfigurableAuth } from "@/types/contract";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import urljoin from "url-join";
import { GridLoader } from "react-spinners";

interface OwnProps {
  className?: string;
}

const SharedServicesCard: React.FunctionComponent<OwnProps> = ({
  className,
}) => {
  const remoteAuths = useFetch<ConfigurableAuth[]>(
    "/api/services/shared/?meta=1"
  );
  const [serviceUrl] = useAsyncState(getBaseURL);

  return (
    <Card className={className}>
      <Card.Header>Shared Services</Card.Header>
      <Card.Body className="pb-2">
        <p>
          Services made available to you by your team. Also list services we
          make available to all PixieBrix users.
        </p>
        {serviceUrl && (
          <p>
            To configure shared services, open the{" "}
            <a href={urljoin(serviceUrl, "services")} target="_blank">
              PixieBrix website
            </a>
          </p>
        )}
      </Card.Body>
      {remoteAuths ? (
        <Table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Service</th>
              <th>Name</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            {remoteAuths.map((remoteAuth) => (
              <tr key={remoteAuth.id}>
                <td>{remoteAuth.organization ?? "✨ Built-in"}</td>
                <td>
                  <code>{remoteAuth.service.config.metadata.id}</code>
                </td>
                <td>{remoteAuth.service.config.metadata.name}</td>
                <td>{remoteAuth.label}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <GridLoader />
      )}
    </Card>
  );
};

export default SharedServicesCard;
