import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Legend as ChartLegend, Tooltip as ChartTooltip } from "chart.js";
import Swal from "sweetalert2";
import API from "../api";
import "./Dashboard.css";

ChartJS.register(ArcElement, ChartLegend, ChartTooltip);

function Dashboard() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");


  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  useEffect(() => {
    loadComplaints();
    if (isAdmin) {
      loadAnalytics();
      loadUsers();
    }
  }, [isAdmin]);

  const submitComplaint = async () => {
    if (!text.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Complaint required",
        text: "Please enter a complaint before submitting.",
      });
      return;
    }


    try {
      const res = await API.post("/analyze", { text });
      setResult(res.data);
      setText("");
      loadComplaints();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Analysis failed",
        text: "Error analyzing complaint",
      });
    }

  };

  const loadComplaints = async () => {
  try {
    const res = await API.get("/complaints");
    console.log("Complaints:", res.data);
    setComplaints(res.data);
  } catch (error) {
    console.error(error);
  }
};

  const loadAnalytics = async () => {
    try {
      const res = await API.get("/analytics");
      setAnalytics(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Failed to load analytics",
      });
    }
  };


  const updateStatus = async (id, status) => {
    try {
      await API.put(`/update-status/${id}`, null, {
        params: { status },
      });
      loadComplaints();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: "Failed to update status",
      });
    }

  };

  const deleteComplaint = async (id) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete this complaint?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await API.delete(`/complaints/${id}`);
      loadComplaints();
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1400,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Failed to delete complaint",
      });
    }
  };


  const editComplaint = async (complaint) => {
    const { value: updatedText } = await Swal.fire({
      icon: "info",
      title: "Edit your complaint",
      input: "textarea",
      inputLabel: "Complaint",
      inputValue: complaint.text,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      inputAttributes: {
        rows: 6,
      },
      preConfirm: (val) => {
        if (!val || !val.trim()) return false;
        return val;
      },
    });

    if (!updatedText || !updatedText.trim()) {
      return;
    }


    try {
      await API.put(`/complaints/${complaint.id}`, {
        text: updatedText,
      });
      loadComplaints();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: "Failed to update complaint",
      });
    }
  };


  const searchComplaints = async () => {
    if (!searchQuery.trim()) {
      Swal.fire({
        icon: "info",
        title: "Enter search text",
        text: "Please enter search text first.",
      });
      return;
    }


    try {
      const res = await API.get("/search", {
        params: { query: searchQuery },
      });
      setComplaints(res.data);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Search failed",
      });
    }
  };


 const loadUsers = async () => {
  try {
    const res = await API.get("/users");
    console.log("Users:", res.data);
    setUsers(res.data);
  } catch (error) {
    console.error(error);
  }
};

  const updateUserRole = async (email, role) => {
    try {
      await API.patch(`/users/${encodeURIComponent(email)}`, { role });
      loadUsers();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Role update failed",
        text: "Failed to update user role",
      });
    }
  };


  const downloadReport = async () => {
    try {
      const res = await API.get("/download-reports", {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "civic_report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Download failed",
      });
    }
  };


  const logout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  const issueDistribution = useMemo(() => {
    const source = Object.keys(analytics).length > 0 ? analytics : complaints.reduce((acc, item) => {
      const issue = item.issue || "Other";
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(source)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [analytics, complaints]);

  const priorityDistribution = useMemo(() => {
    const source = complaints.reduce((acc, item) => {
      const priority = item.priority || "Low";
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(source)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);

  const areaDistribution = useMemo(() => {
    const source = complaints.reduce((acc, item) => {
      const area = item.area || "Unknown";
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(source)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);

  const statusDistribution = useMemo(() => {
    const source = complaints.reduce((acc, item) => {
      const status = item.status || "Pending";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(source)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

    const monthIssues = complaints.filter((item) => new Date(item.created_at || item.updated_at || Date.now()) >= cutoff)
      .reduce((acc, item) => {
        const issue = item.issue || "Other";
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      }, {});

    const total = Object.values(monthIssues).reduce((sum, value) => sum + value, 0) || 1;

    return Object.entries(monthIssues)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [complaints]);

  const palette = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#fb7185", "#f472b6"];

  const trendChartData = {
    labels: monthlyTrend.map((item) => item.name),
    datasets: [
      {
        data: monthlyTrend.map((item) => item.count),
        backgroundColor: monthlyTrend.map((_, index) => palette[index % palette.length]),
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
      },
    ],
  };

  const tabs = [
    { id: "overview", label: "Overview", available: true },
    { id: "submit", label: "Submit Complaint", available: true },
    { id: "complaints", label: "Complaints", available: true },
    { id: "analytics", label: "Analytics", available: isAdmin },
    { id: "users", label: "Users", available: isAdmin },
  ].filter((tab) => tab.available);

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-title" style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>Civic Issue Detector Dashboard</h1>
          <span style={{ color: "var(--muted)", fontWeight: 600 }}>
            Logged in as <strong style={{ color: "var(--text)" }}>{user.name}</strong> (
            {user.role || "citizen"})
          </span>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-shell">
        <aside className="tab-sidebar card">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <main className="tab-panel">
          {activeTab === "overview" && (
            <section className="card panel">
              <div className="panel-title">
                <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Overview</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>A quick snapshot of complaint volume, open cases, and top civic concerns.</p>
              </div>
              <div className="hero-grid">
                <article className="stat-card"><span>Total complaints</span><strong>{complaints.length}</strong></article>
                <article className="stat-card"><span>Open / pending</span><strong>{statusDistribution.find((item) => item.name === "Pending" || item.name === "In Progress")?.value || 0}</strong></article>
                <article className="stat-card"><span>Resolved</span><strong>{statusDistribution.find((item) => item.name === "Resolved")?.value || 0}</strong></article>
                <article className="stat-card"><span>Top concern</span><strong>{issueDistribution[0]?.name || "No data"}</strong></article>
              </div>
              {isAdmin && (
                <div className="card" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <h3 style={{ marginTop: 0 }}>This month’s issue trend</h3>
                  <div className="trend-list">{monthlyTrend.length > 0 ? monthlyTrend.map((item) => (<div key={item.name} className="trend-item"><div className="trend-meta"><span>{item.name}</span><strong>{item.percent}%</strong></div><div className="trend-bar"><span style={{ width: `${item.percent}%` }} /></div></div>)) : <p style={{ color: "var(--muted)" }}>No complaints logged in the last 30 days.</p>}</div>
                </div>
              )}
            </section>
          )}

          {activeTab === "submit" && (
            <section className="card panel">
              <div className="panel-title">
                <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Submit a new civic complaint</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Describe the issue and let the AI classify it for you.</p>
              </div>
              <textarea rows="5" cols="60" placeholder="Enter complaint..." value={text} onChange={(e) => setText(e.target.value)} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <button onClick={submitComplaint}>Analyze Complaint</button>
                <button
                  onClick={() => {
                    loadComplaints();
                    setActiveTab("complaints");
                  }}
                  className="btn btn-secondary"
                >
                  View Complaints
                </button>
                {isAdmin && <button onClick={downloadReport} className="btn btn-secondary">Download Reports</button>}
              </div>
              {result && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ marginBottom: 8 }}>Analysis Result</h3>
                  <table className="table" style={{ width: "100%" }}>
                    <tbody>
                      <tr><td>Issue</td><td>{result.issue}</td></tr>
                      <tr><td>Confidence</td><td>{result.confidence}</td></tr>
                      <tr><td>Priority</td><td>{result.priority}</td></tr>
                      <tr><td>Severity</td><td>{result.severity}</td></tr>
                      <tr><td>Department</td><td>{result.department}</td></tr>
                      <tr><td>Sentiment</td><td>{result.sentiment}</td></tr>
                      <tr><td>Area</td><td>{result.area}</td></tr>
                      {result.duplicate_count > 0 && <tr><td>Similar complaints found</td><td>{result.duplicate_count}</td></tr>}
                      <tr><td>Status</td><td>{result.status}</td></tr>
                      <tr><td>Complaint</td><td>{result.text}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === "complaints" && (
            <section className="card panel">
              {isAdmin && (
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Search complaints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "320px" }}
                  />
                  <button onClick={searchComplaints} style={{ marginLeft: 10 }}>
                    Search
                  </button>
                </div>
              )}

              {complaints.length > 0 ? (
                <div className="table-wrap">
                  <div className="table-scroll">
                    <table className="table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          {isAdmin && <th>Author</th>}
                          <th>Area</th>
                          <th>Issue</th>
                          <th>Priority</th>
                          <th>Department</th>
                          <th>Sentiment</th>
                          <th>Status</th>
                          <th>Complaint</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complaints.map((c) => {
                          const canManage = isAdmin || c.author_email === user.email;

                          const statusLabel = c.status || "Pending";
                          const complaintText = c.text || "No complaint details provided.";
                          const badgeClass =
                            statusLabel === "Resolved"
                              ? "badge--resolved"
                              : statusLabel === "In Progress"
                                ? "badge--inprogress"
                                : statusLabel === "Pending"
                                  ? "badge--pending"
                                  : "badge--default";

                          return (
                            <tr key={c.id}>
                              {isAdmin && (
                                <td>
                                  <span className="cell-muted">{c.author_name || c.author_email}</span>
                                </td>
                              )}
                              <td>{c.area}</td>
                              <td>{c.issue}</td>
                              <td>{c.priority}</td>
                              <td>{c.department}</td>
                              <td className="cell-muted">{c.sentiment}</td>
                              <td>
                                {isAdmin ? (
                                  <select
                                    className="status-select"
                                    value={statusLabel}
                                    onChange={(e) => updateStatus(c.id, e.target.value)}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                  </select>
                                ) : (
                                  <span className={`badge ${badgeClass}`}>
                                    <span className="badge-dot" />
                                    {statusLabel}
                                  </span>
                                )}
                              </td>
                              <td className="cell-muted complaint-text">{complaintText}</td>
                              <td className="actions-cell">
                                {canManage && (
                                  <>
                                    <button
                          onClick={() => editComplaint(c)}
                                      className="btn btn-secondary"
                                      style={{ marginRight: 8, padding: "8px 12px" }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteComplaint(c.id)}
                                      className="btn btn-danger"
                                      style={{ padding: "8px 12px" }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  No complaints available yet.
                </div>
              )}
            </section>
          )}

          {activeTab === "analytics" && isAdmin && (
            <section className="card panel">
              <div className="panel-title">
                <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Analytics</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Visual reports for issues, priorities, areas, and status.</p>
              </div>
              <div className="hero-grid">
                <article className="stat-card"><span>Total complaints</span><strong>{complaints.length}</strong></article>
                <article className="stat-card"><span>Open / pending</span><strong>{statusDistribution.find((item) => item.name === "Pending" || item.name === "In Progress")?.value || 0}</strong></article>
                <article className="stat-card"><span>Resolved</span><strong>{statusDistribution.find((item) => item.name === "Resolved")?.value || 0}</strong></article>
                <article className="stat-card"><span>Top concern</span><strong>{issueDistribution[0]?.name || "No data"}</strong></article>
              </div>
              <div className="mini-grid">
                <article className="chart-card"><h3>Most Common Issues This Month</h3><div className="trend-list">{monthlyTrend.length > 0 ? monthlyTrend.map((item) => (<div key={item.name} className="trend-item"><div className="trend-meta"><span>{item.name}</span><strong>{item.percent}%</strong></div><div className="trend-bar"><span style={{ width: `${item.percent}%` }} /></div></div>)) : <p style={{ color: "var(--muted)" }}>No complaints logged in the last 30 days.</p>}</div></article>
                <article className="chart-card"><h3>Issue distribution</h3><div style={{ width: "100%", height: 260 }}><ResponsiveContainer><BarChart data={issueDistribution.slice(0, 6)}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#e5eefb", fontSize: 12 }} /><YAxis tick={{ fill: "#e5eefb", fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
              </div>
              <div className="mini-grid">
                <article className="chart-card"><h3>Priority distribution</h3><div style={{ width: "100%", height: 260 }}><ResponsiveContainer><PieChart><Pie data={priorityDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>{priorityDistribution.map((entry, index) => (<Cell key={`${entry.name}-${index}`} fill={palette[index % palette.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></article>
                <article className="chart-card"><h3>Area distribution</h3><div style={{ width: "100%", height: 260 }}><ResponsiveContainer><BarChart data={areaDistribution.slice(0, 6)}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#e5eefb", fontSize: 12 }} /><YAxis tick={{ fill: "#e5eefb", fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey="value" fill="#34d399" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
              </div>
              <div className="mini-grid">
                <article className="chart-card"><h3>Status distribution</h3><div style={{ width: "100%", height: 260 }}><ResponsiveContainer><PieChart><Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>{statusDistribution.map((entry, index) => (<Cell key={`${entry.name}-${index}`} fill={palette[(index + 2) % palette.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></article>
                <article className="chart-card"><h3>Monthly trend snapshot</h3><div style={{ width: "100%", height: 260, maxWidth: 320, margin: "0 auto" }}><Doughnut data={trendChartData} options={{ plugins: { legend: { position: "bottom", labels: { color: "#eff6ff" } } } }} /></div></article>
              </div>
            </section>
          )}

          {activeTab === "users" && isAdmin && (
            <section className="card panel">
              <div className="panel-title">
                <h2 style={{ margin: 0, fontSize: "1.15rem" }}>User Management</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Promote or demote users from this panel.</p>
              </div>
              {users.length > 0 ? (
                <div className="table-wrap user-table-wrap">
                  <div className="table-scroll">
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.email}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td><button onClick={() => updateUserRole(u.email, u.role === "admin" ? "citizen" : "admin")}>Set {u.role === "admin" ? "Citizen" : "Admin"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--muted)" }}>No users found.</p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;