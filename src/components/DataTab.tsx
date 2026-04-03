import { useEffect, useState } from "react";
import { fetchSheetsList, fetchSheetData } from "@/lib/api";

const DataTab = () => {
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [filterKab, setFilterKab] = useState("");
  const [kabList, setKabList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSheetsList().then(s => {
      setSheets(s);
      if (s.length > 0) { setSelectedSheet(s[0]); loadData(s[0]); }
    });
  }, []);

  const loadData = async (sheet: string) => {
    setLoading(true);
    const d = await fetchSheetData(sheet);
    setData(d);
    if (d.length > 0) {
      const kabKey = Object.keys(d[0]).find(k => k.toLowerCase().includes('kabupaten') || k.toLowerCase().includes('daerah') || k.toLowerCase().includes('kode')) || Object.keys(d[0])[0];
      const kabs = [...new Set(d.map(r => (r[kabKey] || '').toString().trim()).filter(Boolean))];
      setKabList(kabs.sort());
    }
    setFilterKab("");
    setLoading(false);
  };

  const filteredData = () => {
    if (!filterKab || data.length === 0) return data;
    const kabKey = Object.keys(data[0]).find(k => k.toLowerCase().includes('kabupaten') || k.toLowerCase().includes('daerah') || k.toLowerCase().includes('kode')) || Object.keys(data[0])[0];
    return data.filter(r => (r[kabKey] || '').toString().trim().toLowerCase() === filterKab.toLowerCase());
  };

  const rows = filteredData();
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-foreground">Pilih Sheet:</label>
          <select
            value={selectedSheet}
            onChange={e => { setSelectedSheet(e.target.value); loadData(e.target.value); }}
            className="block w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          >
            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-foreground">Filter Kabupaten:</label>
          <select
            value={filterKab}
            onChange={e => setFilterKab(e.target.value)}
            className="block w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="">Semua Kabupaten</option>
            {kabList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Tidak ada data.</p>
      ) : (
        <div className="glass-card rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-muted">
                {keys.map(k => <th key={k} className="border border-border p-2 text-left">{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  {keys.map(k => <td key={k} className="border border-border p-2">{row[k]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataTab;
