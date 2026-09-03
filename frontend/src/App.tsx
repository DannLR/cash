import { Routes, Route } from "react-router-dom";
import FinanceShell from "@/components/finance/FinanceShell";
import Accounts from "@/pages/Accounts";
import Home from "@/pages/Home";
import Insights from "@/pages/Insights";
import Planning from "@/pages/Planning";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route element={<FinanceShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/planejamento" element={<Planning />} />
        <Route path="/contas" element={<Accounts />} />
        <Route path="/insights" element={<Insights />} />
      </Route>
    </Routes>
  );
}
