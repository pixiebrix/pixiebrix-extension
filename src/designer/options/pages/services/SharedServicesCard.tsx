import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import React from "react";
import { ConfigurableAuth } from "@/types/contract";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import urljoin from "url-join";
import { GridLoader } from "react-spinners";

interface OwnProps {
  remoteAuths: ConfigurableAuth[];
}

const SharedServicesCard: React.FunctionComponent<OwnProps> = ({
  remoteAuths,
}) => {
  const [serviceUrl] = useAsyncState(getBaseURL);

  return (
    <>
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
                <td>{remoteAuth.organization ?? "✨ Built-in"}</td>
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
    </>
  );
};

export default SharedServicesCard;
