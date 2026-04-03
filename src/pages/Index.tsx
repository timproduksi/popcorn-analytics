import { useEffect, useState } from "react";
import { BarChart3, Database, LayoutDashboard } from "lucide-react";
import Header from "@/components/Header";
import DashboardTab from "@/components/DashboardTab";
import AnalisisTab from "@/components/AnalisisTab";
import DataTab from "@/components/DataTab";
import { fetchApiData, fetchRawData } from "@/lib/api";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analisis", label: "Analisis Data", icon: BarChart3 },
  { id: "data", label: "Data", icon: Database },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [apiData, setApiData] = useState<Record<string, any>>({});
  const [rawData, setRawData] = useState<Record<string, any[]>>({});
  const [sheets, setSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchApiData();
        setApiData(data);
        const sheetNames = Object.keys(data);
        setSheets(sheetNames);

        // Load raw data for all sheets
        const rawResults: Record<string, any[]> = {};
        await Promise.all(
          sheetNames.map(async (s) => {
            try {
              rawResults[s] = await fetchRawData(s);
            } catch { rawResults[s] = []; }
          })
        );
        setRawData(rawResults);
      } catch (err) {
        setError("Gagal memuat data dari API");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? "gradient-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Status */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Memuat data…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {!loading && !error && (
          <>
            {activeTab === "dashboard" && <DashboardTab sheets={sheets} rawData={rawData} />}
            {activeTab === "analisis" && <AnalisisTab apiData={apiData} rawData={rawData} sheets={sheets} />}
            {activeTab === "data" && <DataTab />}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
