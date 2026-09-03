import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FinanceShell from "@/components/finance/FinanceShell";
import Accounts from "@/pages/Accounts";
import CardDetails from "@/pages/CardDetails";
import Cards from "@/pages/Cards";
import Home from "@/pages/Home";
import Insights from "@/pages/Insights";
import Login from "@/pages/Login";
import Planning from "@/pages/Planning";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<FinanceShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/planejamento" element={<Planning />} />
          <Route path="/contas" element={<Accounts />} />
          <Route path="/cartoes" element={<Cards />} />
          <Route path="/cartoes/:cardId" element={<CardDetails />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Route>
    </Routes>
  );
}
