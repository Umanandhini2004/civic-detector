import Login from "./Login";
import Dashboard from "./components/Dashboard";

function App() {

  const user = localStorage.getItem("user");

  return (
    <div>
      {user ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;