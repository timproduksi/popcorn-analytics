import { useEffect, useState, useRef } from "react";
import { COLORS, BULAN_NAMES, PHASE_DESCRIPTIONS } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const ALL_PHASES = Object.keys(COLORS);

interface AnalisisTabProps {
  apiData: Record<string, any>;
  rawData: Record<string, any[]>;
  sheets: string[];
}

const AnalisisTab = ({ apiData, rawData, sheets }: AnalisisTabProps) => {
  const [selectedSheet, setSelectedSheet] = useState(sheets[0] || "");
  const [compareSheet, setCompareSheet] = useState("");
  const [filterKabupaten, setFilterKabupaten] = useState("");
  const [kabupatenList, setKabupatenList] = useState<string[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<string[]>(ALL_PHASES);
  const [showPhaseDropdown, setShowPhaseDropdown] = useState(false);
  const phaseDropdownRef = useRef<HTMLDivElement>(null);
  const [modalText, setModalText] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (phaseDropdownRef.current && !phaseDropdownRef.current.contains(e.target as Node)) {
        setShowPhaseDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const togglePhase = (phase: string) => {
    setSelectedPhases(prev =>
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    );
  };

  useEffect(() => {
    const allKab = new Set<string>();
    sheets.forEach(s => {
      if (apiData[s]?.kabupaten) {
        apiData[s].kabupaten.forEach((k: string) => allKab.add(k));
      }
    });
    setKabupatenList(Array.from(allKab).sort());
  }, [apiData, sheets]);

  useEffect(() => {
    if (sheets.length > 0 && !selectedSheet) setSelectedSheet(sheets[0]);
  }, [sheets]);

  const getSeriesData = (sheetName: string, kab: string) => {
    const sheet = apiData[sheetName];
    if (!sheet) return {};
    if (kab && sheet.data?.[kab]) return sheet.data[kab];
    return sheet.aggregated || {};
  };

  // Build chart data for single or comparison mode
  const buildChartData = () => {
    const series1 = getSeriesData(selectedSheet, filterKabupaten);
    const series2 = compareSheet ? getSeriesData(compareSheet, filterKabupaten) : null;
    const labels = apiData[selectedSheet]?.labels || BULAN_NAMES;

    return labels.map((label: string, i: number) => {
      const point: any = { bulan: label };
      Object.keys(COLORS).filter(phase => selectedPhases.includes(phase)).forEach(phase => {
        if (series1[phase]) {
          const suffix = series2 ? ` (${selectedSheet})` : "";
          point[`${phase}${suffix}`] = series1[phase][i] || 0;
        }
        if (series2 && series2[phase]) {
          point[`${phase} (${compareSheet})`] = series2[phase][i] || 0;
        }
      });
      return point;
    });
  };

  const chartData = buildChartData();

  // Get all dataset keys for bars
  const getBarKeys = () => {
    const series1 = getSeriesData(selectedSheet, filterKabupaten);
    const series2 = compareSheet ? getSeriesData(compareSheet, filterKabupaten) : null;
    const keys: { key: string; color: string }[] = [];

    Object.keys(COLORS).filter(phase => selectedPhases.includes(phase)).forEach(phase => {
      if (series1[phase]) {
        const suffix = series2 ? ` (${selectedSheet})` : "";
        keys.push({ key: `${phase}${suffix}`, color: COLORS[phase] });
      }
      if (series2 && series2[phase]) {
        keys.push({ key: `${phase} (${compareSheet})`, color: COLORS[phase] + "99" });
      }
    });
    return keys;
  };

  // Custom tooltip for comparison mode
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    if (!compareSheet) {
      return (
        <div className="glass-card rounded-lg p-3 text-xs max-w-xs">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} style={{ color: p.fill }}>
              {p.dataKey}: {p.value}
            </p>
          ))}
        </div>
      );
    }

    // Comparison mode: group by phase and show "vs" format
    const phases = Object.keys(COLORS);
    const grouped: Record<string, { v1?: number; v2?: number }> = {};

    payload.forEach((p: any) => {
      const phase = phases.find(ph => p.dataKey.startsWith(ph));
      if (!phase) return;
      if (!grouped[phase]) grouped[phase] = {};
      if (p.dataKey.includes(selectedSheet)) grouped[phase].v1 = p.value;
      else if (p.dataKey.includes(compareSheet)) grouped[phase].v2 = p.value;
    });

    return (
      <div className="glass-card rounded-lg p-3 text-xs max-w-xs">
        <p className="font-semibold mb-1">{label}</p>
        {Object.entries(grouped).map(([phase, vals]) => (
          <p key={phase} style={{ color: COLORS[phase] }}>
            {phase} {selectedSheet} vs {compareSheet} : {vals.v1 ?? 0} vs {vals.v2 ?? 0}
          </p>
        ))}
      </div>
    );
  };

  // Table rendering
  const tableData = buildTableData(rawData[selectedSheet] || [], filterKabupaten);

  const handleCellClick = (nilaiStr: string) => {
    let text = "";
    if (nilaiStr === "6") text = "Panen diantara 2 survei kode 6 Panen Muda";
    else if (nilaiStr === "7") text = "Panen diantara 2 survei kode 7 Panen Pipilan";
    else {
      const nilais = nilaiStr.split(",").map(n => parseInt(n));
      const faseList = nilais.map(n => PHASE_DESCRIPTIONS[n] || "Tidak diketahui").join(", ");
      text = `Nilai Amatan: ${nilaiStr} — Fase: ${faseList}`;
    }
    setModalText(text);
    setShowModal(true);
  };

  const barKeys = getBarKeys();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-foreground">Tahun / Sheet:</label>
          <select
            value={selectedSheet}
            onChange={e => setSelectedSheet(e.target.value)}
            className="block w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          >
            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-foreground">Bandingkan dengan:</label>
          <select
            value={compareSheet}
            onChange={e => setCompareSheet(e.target.value)}
            className="block w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="">— Tidak ada —</option>
            {sheets.filter(s => s !== selectedSheet).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-foreground">Kabupaten:</label>
          <select
            value={filterKabupaten}
            onChange={e => setFilterKabupaten(e.target.value)}
            className="block w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="">Semua Kabupaten</option>
            {kabupatenList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-base font-semibold mb-3 text-foreground">
          {compareSheet
            ? `Perbandingan ${selectedSheet} vs ${compareSheet}`
            : `Tahun: ${selectedSheet}`}
          {filterKabupaten ? ` — ${filterKabupaten}` : ""}
        </h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {barKeys.map(({ key, color }) => (
              <Bar key={key} dataKey={key} stackId={key.includes(compareSheet || "___") ? "b" : "a"} fill={color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl p-4 overflow-x-auto">
        <h3 className="text-base font-semibold mb-3 text-foreground">
          Identifikasi Panen Pada Sub Segmen KSA Jagung
        </h3>
        <div className="text-sm text-muted-foreground mb-2 space-x-6 flex flex-wrap gap-y-1">
          <span>Kabupaten: <strong className="text-foreground">{filterKabupaten || "Semua"}</strong></span>
          <span>Segmen: <strong className="text-foreground">{tableData.summary.segmen}</strong></span>
          <span>SubSegmen: <strong className="text-foreground">{tableData.summary.subsegmen}</strong></span>
          <span>Total Panen: <strong className="text-foreground">{tableData.summary.totalPanen}</strong></span>
        </div>
        <table className="w-full text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left">Kabupaten</th>
              <th className="border border-border p-2 text-left">ID-Subsegmen</th>
              {BULAN_NAMES.map(b => <th key={b} className="border border-border p-2">{b}</th>)}
              <th className="border border-border p-2">Jml Panen</th>
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/50">
                <td className="border border-border p-2">{row.kab}</td>
                <td className="border border-border p-2">{row.subseg}</td>
                {row.bulanCells.map((cell, bi) => (
                  <td
                    key={bi}
                    className={`border border-border p-2 text-center ${
                      cell.isPanen
                        ? cell.isKuning
                          ? "bg-accent text-accent-foreground font-bold cursor-pointer"
                          : "bg-primary text-primary-foreground font-bold cursor-pointer"
                        : ""
                    }`}
                    onClick={() => cell.isPanen && cell.panenCode && handleCellClick(cell.panenCode)}
                  >
                    {cell.isPanen ? "✓" : "0"}
                  </td>
                ))}
                <td className="border border-border p-2 text-center font-semibold">{row.jumlahPanen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl p-6 shadow-2xl max-w-sm mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Detail Panen</h3>
            <p className="text-sm text-muted-foreground">{modalText}</p>
            <button onClick={() => setShowModal(false)} className="mt-4 px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-sm font-medium">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface BulanCell {
  isPanen: boolean;
  isKuning: boolean;
  panenCode: string | null;
}

interface TableRow {
  kab: string;
  subseg: string;
  bulanCells: BulanCell[];
  jumlahPanen: number;
}

function buildTableData(data: any[], filterKabupaten: string) {
  const grouped: Record<string, { kab: string; subseg: string; bulan: number[][] }> = {};

  data.forEach(row => {
    const kab = row.A || row.Kabupaten || "";
    const subseg = row.B || row['ID-Subsegmen'] || "";
    const key = `${kab}-${subseg}`;
    if (!grouped[key]) {
      grouped[key] = { kab, subseg, bulan: Array.from({ length: 12 }, () => []) };
    }
    for (let i = 3; i <= 14; i++) {
      const colName = String.fromCharCode(65 + i);
      const nilai = row[colName] || row[Object.keys(row)[i]];
      if (nilai) grouped[key].bulan[i - 3].push(parseInt(nilai));
    }
  });

  let items = Object.values(grouped);
  if (filterKabupaten) items = items.filter(it => it.kab === filterKabupaten);

  let totalPanen = 0;
  const rows: TableRow[] = items.map(item => {
    const bulanCells: BulanCell[] = item.bulan.map((vals, idx) => {
      let isPanen = false, isKuning = false;
      let panenCode: string | null = null;

      if (vals.some(v => [5, 6, 7].includes(v))) {
        isPanen = true;
        panenCode = vals.filter(v => [5, 6, 7].includes(v)).join(",");
      }

      if (idx > 0) {
        const prevVals = item.bulan[idx - 1];
        const prevNilai = prevVals.length > 0 ? prevVals[prevVals.length - 1] : null;
        const currNilai = vals.length > 0 ? vals[vals.length - 1] : null;

        if (prevNilai === 3 && currNilai !== null && [1, 2].includes(currNilai)) {
          isPanen = true; isKuning = true; panenCode = "6";
        } else if (prevNilai === 4 && currNilai !== null && [1, 2, 3].includes(currNilai)) {
          isPanen = true; isKuning = true; panenCode = "7";
        }
      }

      return { isPanen, isKuning, panenCode };
    });

    const panenBulan = bulanCells.map((c, i) => c.isPanen ? i : -1).filter(i => i !== -1);
    let jumlahPanen = 0;
    if (panenBulan.length > 0) {
      jumlahPanen = 1;
      for (let i = 1; i < panenBulan.length; i++) {
        if (panenBulan[i] !== panenBulan[i - 1] + 1) jumlahPanen++;
      }
    }
    totalPanen += jumlahPanen;

    return { kab: item.kab, subseg: item.subseg, bulanCells, jumlahPanen };
  });

  return {
    rows,
    summary: {
      segmen: Math.floor(items.length / 4),
      subsegmen: items.length,
      totalPanen,
    },
  };
}

export default AnalisisTab;
