import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import API from "./api";

function Login() {
  const handleSuccess = async (response) => {
    const user = jwtDecode(response.credential);

    try {
      const res = await API.post("/login", {
        name: user.name,
        email: user.email,
      });

      const storedUser = {
        name: user.name,
        email: user.email,
        role: res.data.role || "citizen",
      };

      localStorage.setItem("user", JSON.stringify(storedUser));
      window.location.reload();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Login failed",
        text: "Please try again.",
      });
    }
  };

  return (
    <div className="page" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ maxWidth: 520, width: "100%", textAlign: "center", padding: "28px" }}>
        <span style={{ display: "inline-flex", padding: "8px 10px", borderRadius: 999, background: "rgba(56, 189, 248, 0.14)", color: "#dbeafe", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5 }}>
          Civic Engagement Platform
        </span>
        <h1 className="brand" style={{ fontSize: 42, marginTop: 10 }}>Civic Issue Detector</h1>
        <p className="subtitle" style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 430, margin: "10px auto 0" }}>
          Report local problems, classify issues faster, and keep admins informed with a clean, modern workspace.
        </p>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() =>
              Swal.fire({
                icon: "error",
                title: "Login failed",
                text: "Login Failed",
              })
            }
          />
        </div>

        <div style={{ marginTop: 18, color: "var(--muted)", fontSize: 13 }}>
          Secure Google sign-in for citizens and administrators.
        </div>
      </div>
    </div>
  );
}

export default Login;
