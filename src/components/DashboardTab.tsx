import { useEffect, useState } from "react";
import { Layers, Grid3X3, CheckCircle2, XCircle, Building2, Sprout } from "lucide-react";
import { type Metrics, calculateMetrics, BULAN_NAMES } from "@/lib/api";

interface DashboardTabProps {
  sheets: string[];
  rawData: Record<string, any[]>;
}

const METRIC_CARDS = [
  { key: "jumlahSegmen" as const, label: "Jumlah Segmen", icon: Layers, gradient: "gradient-primary" },
  { key: "jumlahSubsegmen" as const, label: "Jumlah Subsegmen", icon: Grid3X3, gradient: "gradient-success" },
  { key: "jumlahSubsegmenPanen" as const, label: "SubSegmen Panen", icon: CheckCircle2, gradient: "gradient-warning" },
  { key: "jumlahSubsegmenBera" as const, label: "SubSegmen Bera", icon: XCircle, gradient: "gradient-danger" },
  { key: "jumlahSubsegmenBukanLahan" as const, label: "Bukan Lahan Pertanian", icon: Building2, gradient: "gradient-info" },
  { key: "jumlahSubsegmenBukanJagung" as const, label: "Bukan Jagung", icon: Sprout, gradient: "gradient-muted" },
];

const DashboardTab = ({ sheets, rawData }: DashboardTabProps) => {
  const [selectedSheet, setSelectedSheet] = useState(sheets[0] || "");
  const [selectedBulan, setSelectedBulan] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (selectedSheet && rawData[selectedSheet]) {
      setMetrics(calculateMetrics(rawData[selectedSheet], selectedBulan));
    }
  }, [selectedSheet, selectedBulan, rawData]);

  useEffect(() => {
    if (sheets.length > 0 && !selectedSheet) setSelectedSheet(sheets[0]);
  }, [sheets]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">Pilih Tahun:</label>
        <div className="flex flex-wrap gap-2">
          {sheets.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSheet(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedSheet === s
                  ? "gradient-primary text-primary-foreground shadow-md scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">Pilih Bulan:</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBulan(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              selectedBulan === null
                ? "gradient-secondary text-secondary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Semua
          </button>
          {BULAN_NAMES.map((b, i) => (
            <button
              key={b}
              onClick={() => setSelectedBulan(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedBulan === i
                  ? "gradient-secondary text-secondary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics && METRIC_CARDS.map(({ key, label, icon: Icon, gradient }, idx) => (
          <div
            key={key}
            className={`${gradient} rounded-xl p-5 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-scale-in`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium opacity-90">{label}</span>
            </div>
            <p className="text-3xl font-extrabold">{metrics[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardTab;
