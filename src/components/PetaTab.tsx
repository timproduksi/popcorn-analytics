import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COLORS, BULAN_NAMES } from "@/lib/api";

// Approximate coordinates for Jawa Tengah kabupaten
const KABUPATEN_COORDS: Record<string, [number, number]> = {
  "3301": [-7.53, 109.05],
  "3302": [-7.40, 109.23],
  "3303": [-7.35, 109.50],
  "3304": [-7.38, 109.65],
  "3305": [-7.30, 109.90],
  "3306": [-7.60, 110.00],
  "3307": [-7.47, 110.18],
  "3308": [-7.33, 110.20],
  "3309": [-7.58, 110.40],
  "3310": [-7.45, 110.60],
  "3311": [-7.55, 110.80],
  "3312": [-7.60, 111.00],
  "3313": [-7.50, 110.85],
  "3314": [-7.45, 110.95],
  "3315": [-7.10, 110.65],
  "3316": [-6.95, 110.40],
  "3317": [-6.85, 110.85],
  "3318": [-6.70, 111.05],
  "3319": [-6.60, 110.85],
  "3320": [-6.73, 110.65],
  "3321": [-7.05, 110.42],
  "3322": [-7.00, 110.38],
  "3323": [-7.20, 110.30],
  "3324": [-7.08, 110.10],
  "3325": [-6.88, 109.68],
  "3326": [-6.89, 109.40],
  "3327": [-7.05, 109.35],
  "3328": [-6.87, 109.15],
  "3329": [-7.00, 108.90],
  "3371": [-7.43, 110.43],
  "3372": [-7.00, 110.43],
  "3373": [-6.97, 110.42],
  "3374": [-6.89, 109.68],
  "3375": [-6.87, 109.14],
  "3376": [-7.47, 110.22],
};

const KABUPATEN_NAMES: Record<string, string> = {
  "3301": "Cilacap", "3302": "Banyumas", "3303": "Purbalingga", "3304": "Banjarnegara",
  "3305": "Kebumen", "3306": "Purworejo", "3307": "Wonosobo", "3308": "Magelang",
  "3309": "Boyolali", "3310": "Klaten", "3311": "Sukoharjo", "3312": "Wonogiri",
  "3313": "Karanganyar", "3314": "Sragen", "3315": "Grobogan", "3316": "Blora",
  "3317": "Rembang", "3318": "Pati", "3319": "Kudus", "3320": "Jepara",
  "3321": "Demak", "3322": "Semarang", "3323": "Temanggung", "3324": "Kendal",
  "3325": "Batang", "3326": "Pekalongan", "3327": "Pemalang", "3328": "Tegal",
  "3329": "Brebes", "3371": "Kota Surakarta", "3372": "Kota Salatiga",
  "3373": "Kota Semarang", "3374": "Kota Pekalongan", "3375": "Kota Tegal",
  "3376": "Kota Magelang",
};

function createPieSVG(data: { label: string; value: number; color: string }[], size: number = 50): string {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return "";
  const r = size / 2;
  let startAngle = 0;
  const paths = data.filter(d => d.value > 0).map(d => {
    const angle = (d.value / total) * 360;
    const end = startAngle + angle;
    const s = ((startAngle - 90) * Math.PI) / 180;
    const e = ((end - 90) * Math.PI) / 180;
    const x1 = r + r * Math.cos(s), y1 = r + r * Math.sin(s);
    const x2 = r + r * Math.cos(e), y2 = r + r * Math.sin(e);
    const large = angle > 180 ? 1 : 0;
    const path = angle >= 360
      ? `<circle cx="${r}" cy="${r}" r="${r}" fill="${d.color}" />`
      : `<path d="M${r},${r} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${d.color}" stroke="white" stroke-width="0.5"/>`;
    startAngle = end;
    return path;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/>${paths}<circle cx="${r}" cy="${r}" r="${r * 0.18}" fill="white"/></svg>`;
}

interface PetaTabProps {
  apiData: Record<string, any>;
  rawData: Record<string, any[]>;
  sheets: string[];
}

const PHASE_MAP: Record<number, string> = {
  0: "Tidak diamati", 1: "Vegetatif Awal", 2: "Vegetatif Akhir",
  3: "Reproduktif Awal", 4: "Reproduktif Akhir", 5: "Panen Hijauan",
  6: "Panen Muda", 7: "Panen Pipilan", 8: "Persiapan Lahan",
  9: "Lahan Pertanian Bukan Jagung", 10: "Bukan Lahan Pertanian",
  11: "Puso", 15: "Bera",
};

const PetaTab = ({ rawData, sheets }: PetaTabProps) => {
  const [selectedSheet, setSelectedSheet] = useState(sheets[0] || "");
  const [selectedBulan, setSelectedBulan] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (sheets.length > 0 && !selectedSheet) setSelectedSheet(sheets[0]);
  }, [sheets]);

  const kabupatenData = useMemo(() => {
    const data = rawData[selectedSheet] || [];
    const grouped: Record<string, Record<string, number>> = {};
    data.forEach(row => {
      const kab = String(row.A || row.Kabupaten || "").trim();
      if (!kab) return;
      if (!grouped[kab]) {
        grouped[kab] = {};
        Object.keys(COLORS).forEach(p => { grouped[kab][p] = 0; });
      }
      const colIndex = selectedBulan + 3;
      const colName = String.fromCharCode(65 + colIndex);
      const nilai = parseInt(row[colName] || row[Object.keys(row)[colIndex]] || "0");
      const phaseName = PHASE_MAP[nilai];
      if (phaseName && grouped[kab][phaseName] !== undefined) {
        grouped[kab][phaseName]++;
      }
    });
    return grouped;
  }, [rawData, selectedSheet, selectedBulan]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current).setView([-7.15, 110.0], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    Object.entries(kabupatenData)
      .filter(([kab]) => KABUPATEN_COORDS[kab])
      .forEach(([kab, phases]) => {
        const pieData = Object.entries(phases)
          .filter(([, v]) => v > 0)
          .map(([label, value]) => ({ label, value, color: COLORS[label] || "#ccc" }));
        const total = pieData.reduce((s, d) => s + d.value, 0);
        if (total === 0) return;

        const svgHtml = createPieSVG(pieData, 50);
        const icon = L.divIcon({
          html: svgHtml,
          className: "pie-marker",
          iconSize: [50, 50],
          iconAnchor: [25, 25],
        });

        const popupContent = `<div style="font-size:12px;min-width:160px">
          <b>${KABUPATEN_NAMES[kab] || kab}</b><br/>
          <span style="color:#666">Total: ${total}</span><br/>
          ${pieData.map(d => `<span style="display:inline-block;width:10px;height:10px;background:${d.color};border-radius:2px;margin-right:4px"></span>${d.label}: ${d.value}`).join("<br/>")}
        </div>`;

        const marker = L.marker(KABUPATEN_COORDS[kab], { icon })
          .bindPopup(popupContent)
          .addTo(map);
        markersRef.current.push(marker);
      });
  }, [kabupatenData]);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4">
        <h2 className="text-lg font-bold mb-4 text-foreground">
          Amatan KSA Jagung Per Kabupaten di Jawa Tengah — {BULAN_NAMES[selectedBulan]}
        </h2>

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedSheet}
            onChange={e => setSelectedSheet(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
          >
            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={selectedBulan}
            onChange={e => setSelectedBulan(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
          >
            {BULAN_NAMES.map((b, i) => <option key={i} value={i}>{b}</option>)}
          </select>
        </div>

        <div
          ref={mapRef}
          className="rounded-xl overflow-hidden border border-border"
          style={{ height: "550px" }}
        />

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          {Object.entries(COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PetaTab;
