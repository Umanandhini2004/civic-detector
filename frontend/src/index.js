import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import {
  GoogleOAuthProvider
} from "@react-oauth/google";

const root = ReactDOM.createRoot(
  document.getElementById("root")
);

root.render(

  <GoogleOAuthProvider
    clientId="144468515469-arnkck8hgigvdsqgpbhkbjn1escfhg3u.apps.googleusercontent.com"
  >
    <App />
  </GoogleOAuthProvider>

);