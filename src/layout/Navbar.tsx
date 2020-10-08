import React, { useContext } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import Nav from "react-bootstrap/Nav";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSignOutAlt,
  faBars,
  faCaretDown,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "@/auth/context";
import { Link } from "react-router-dom";
import axios from "axios";
import logo from "@img/logo.svg";
import logoSmall from "@img/logo-small.svg";
import { DEFAULT_SERVICE_URL, getBaseURL } from "@/services/baseService";
import { useAsyncState } from "@/hooks/common";

const Navbar: React.FunctionComponent = () => {
  const { email, extension } = useContext(AuthContext);
  const [serviceURL] = useAsyncState<string>(getBaseURL);

  return (
    <nav className="navbar default-layout-navbar col-lg-12 col-12 p-0 fixed-top d-flex flex-row">
      <div className="text-center navbar-brand-wrapper d-flex align-items-center justify-content-center">
        <Link className="navbar-brand brand-logo" to="/">
          <img src={logo} alt="PixieBrix logo" />
        </Link>
        <Link className="navbar-brand brand-logo-mini" to="/">
          <img src={logoSmall} alt="PixieBrix mini logo" />
        </Link>
      </div>
      <div className="navbar-menu-wrapper d-flex align-items-stretch">
        <button
          className="navbar-toggler navbar-toggler align-self-center"
          type="button"
          onClick={() => document.body.classList.toggle("sidebar-icon-only")}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        <ul className="navbar-nav navbar-nav-right">
          {serviceURL && (
            <Nav.Link
              className="mb-1 px-3"
              target="_blank"
              href={serviceURL ?? DEFAULT_SERVICE_URL}
            >
              Open Web App <FontAwesomeIcon icon={faExternalLinkAlt} />
            </Nav.Link>
          )}

          {email && !extension && (
            <li className="nav-item nav-profile">
              <Dropdown alignRight>
                <Dropdown.Toggle id="profile-dropdown" className="nav-link">
                  <div className="d-flex">
                    <div className="mb-1 text-black">{email}</div>
                    <div className="ml-2 text-primary">
                      <FontAwesomeIcon icon={faCaretDown} />
                    </div>
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu className="navbar-dropdown">
                  <Dropdown.Item
                    href="#"
                    onClick={async (e: any) => {
                      e.preventDefault();
                      await axios.post("/logout/");
                      location.href = "/";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faSignOutAlt}
                      className="mr-2 text-primary"
                    />
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </li>
          )}
          {email && extension && <div className="mb-1 text-black">{email}</div>}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
