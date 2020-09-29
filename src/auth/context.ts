import React from "react";
import axios from "axios";
import Cookies from "js-cookie";

axios.defaults.headers.post["X-CSRFToken"] = Cookies.get("csrftoken");

interface Profile {
  userId?: string;
  email?: string;
  isLoggedIn: boolean;
  extension: boolean;
}

const initialState: Profile = {
  userId: undefined,
  email: undefined,
  isLoggedIn: false,
  extension: false,
};

export const AuthContext = React.createContext(initialState);
