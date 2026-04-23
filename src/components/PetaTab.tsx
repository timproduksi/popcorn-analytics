import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { COLORS, BULAN_NAMES } from "@/lib/api";
import jatengGeo from "@/data/jateng-kab.json";

// Approximate coordinates for Jawa Tengah kabupaten
const KABUPATEN_COORDS: Record<string, [number, number]> = {
  "3301": [-7.64, 108.86],   // Cilacap
  "3302": [-7.43, 109.24],   // Banyumas
  "3303": [-7.39, 109.36],   // Purbalingga
  "3304": [-7.39, 109.69],   // Banjarnegara
  "3305": [-7.60, 109.65],   // Kebumen
  "3306": [-7.72, 110.01],   // Purworejo
  "3307": [-7.36, 109.98],   // Wonosobo
  "3308": [-7.47, 110.22],   // Magelang
  "3309": [-7.53, 110.60],   // Boyolali
  "3310": [-7.70, 110.60],   // Klaten
  "3311": [-7.68, 110.84],   // Sukoharjo
  "3312": [-7.83, 110.92],   // Wonogiri
  "3313": [-7.60, 110.95],   // Karanganyar
  "3314": [-7.43, 111.02],   // Sragen
  "3315": [-7.08, 110.90],   // Grobogan
  "3316": [-6.97, 111.41],   // Blora
  "3317": [-6.71, 111.35],   // Rembang
  "3318": [-6.75, 111.04],   // Pati
  "3319": [-6.80, 110.84],   // Kudus
  "3320": [-6.59, 110.68],   // Jepara
  "3321": [-6.89, 110.64],   // Demak
  "3322": [-7.21, 110.44],   // Semarang
  "3323": [-7.31, 110.17],   // Temanggung
  "3324": [-7.03, 110.17],   // Kendal
  "3325": [-7.01, 109.73],   // Batang
  "3326": [-7.08, 109.60],   // Pekalongan
  "3327": [-6.98, 109.38],   // Pemalang
  "3328": [-6.97, 109.15],   // Tegal
  "3329": [-6.97, 108.93],   // Brebes
  "3371": [-7.57, 110.82],   // Kota Surakarta
  "3372": [-7.33, 110.49],   // Kota Salatiga
  "3373": [-6.97, 110.42],   // Kota Semarang
  "3374": [-6.89, 109.67],   // Kota Pekalongan
  "3375": [-6.87, 109.14],   // Kota Tegal
  "3376": [-7.47, 110.18],   // Kota Magelang
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

const PHASE_OPTIONS = Object.entries(PHASE_MAP).map(([k, v]) => ({ code: Number(k), name: v }));

const PetaTab = ({ rawData, sheets }: PetaTabProps) => {
  const [selectedSheet, setSelectedSheet] = useState(sheets[0] || "");
  const [selectedBulan, setSelectedBulan] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Second map (choropleth by phase count)
  const [selectedSheet2, setSelectedSheet2] = useState<string>(sheets[0] || "");
  const [selectedKab2, setSelectedKab2] = useState<string>("ALL");
  const [selectedBulan2, setSelectedBulan2] = useState<number>(0);
  const [selectedFase2, setSelectedFase2] = useState<number>(1);
  const map2Ref = useRef<HTMLDivElement>(null);
  const map2InstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (sheets.length > 0 && !selectedSheet) setSelectedSheet(sheets[0]);
    if (sheets.length > 0 && !selectedSheet2) setSelectedSheet2(sheets[0]);
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

  // ===== Second map: gradient by phase count =====
  const phaseCountByKab = useMemo(() => {
    const data = rawData[selectedSheet2] || [];
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const kab = String(row.A || row.Kabupaten || "").trim();
      if (!kab) return;
      if (selectedKab2 !== "ALL" && kab !== selectedKab2) return;
      const colIndex = selectedBulan2 + 3;
      const colName = String.fromCharCode(65 + colIndex);
      const nilai = parseInt(row[colName] || row[Object.keys(row)[colIndex]] || "0");
      if (nilai === selectedFase2) {
        counts[kab] = (counts[kab] || 0) + 1;
      } else if (!(kab in counts)) {
        counts[kab] = 0;
      }
    });
    return counts;
  }, [rawData, selectedSheet2, selectedBulan2, selectedFase2, selectedKab2]);

  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(phaseCountByKab)),
    [phaseCountByKab]
  );

  const phaseColor = COLORS[PHASE_MAP[selectedFase2]] || "#16a34a";

  // Map GeoJSON feature name -> BPS code
  const nameToCode = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(KABUPATEN_NAMES).forEach(([code, name]) => {
      m[name.toLowerCase()] = code;
      // also support "Salatiga" -> "Kota Salatiga"
      m[name.replace(/^Kota\s+/i, "").toLowerCase()] = code;
    });
    return m;
  }, []);

  // Initialize second map
  useEffect(() => {
    if (!map2Ref.current || map2InstanceRef.current) return;
    const map = L.map(map2Ref.current).setView([-7.15, 110.0], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    map2InstanceRef.current = map;
    return () => { map.remove(); map2InstanceRef.current = null; };
  }, []);

  // helper: blend phaseColor with white based on intensity (0..1)
  const shade = (hex: string, intensity: number) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    // mix with white: t=0.35 -> pucat, t=1 -> warna penuh sesuai legenda
    const t = 0.35 + intensity * 0.65;
    const mix = (c: number) => Math.round(255 + (c - 255) * t);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  };

  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  // Update choropleth GeoJSON layer
  useEffect(() => {
    const map = map2InstanceRef.current;
    if (!map) return;
    if (geoLayerRef.current) {
      geoLayerRef.current.remove();
      geoLayerRef.current = null;
    }

    const layer = L.geoJSON(jatengGeo as any, {
      style: (feature: any) => {
        const name = String(feature.properties.name || "");
        const code = nameToCode[name.toLowerCase()];
        const count = code ? (phaseCountByKab[code] || 0) : 0;
        const intensity = maxCount > 0 ? count / maxCount : 0;
        return {
          fillColor: count === 0 ? "#e5e7eb" : shade(phaseColor, intensity),
          weight: 1,
          color: "#ffffff",
          fillOpacity: 0.9,
        };
      },
      onEachFeature: (feature: any, lyr: L.Layer) => {
        const name = String(feature.properties.name || "");
        const code = nameToCode[name.toLowerCase()];
        const count = code ? (phaseCountByKab[code] || 0) : 0;
        const displayName = code ? KABUPATEN_NAMES[code] : name;
        (lyr as L.Path).bindPopup(
          `<div style="font-size:12px;min-width:160px">
            <b>${displayName}</b><br/>
            <span style="color:#666">${PHASE_MAP[selectedFase2]}</span><br/>
            Jumlah: <b>${count}</b>
          </div>`
        );
      },
    }).addTo(map);
    geoLayerRef.current = layer;
  }, [phaseCountByKab, maxCount, phaseColor, selectedFase2, nameToCode]);


  const totalFase = useMemo(
    () => Object.values(phaseCountByKab).reduce((s, n) => s + n, 0),
    [phaseCountByKab]
  );

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

      {/* Second map: gradient by phase */}
      <div className="glass-card rounded-xl p-4">
        <h2 className="text-lg font-bold mb-1 text-foreground">
          Sebaran Jumlah Sub-Segmen per Fase Amatan
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Choropleth: warna mengikuti fase amatan terpilih, intensitas berdasarkan jumlah sub-segmen.
          Total: <b>{totalFase}</b> sub-segmen.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedKab2}
            onChange={e => setSelectedKab2(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
          >
            <option value="ALL">Semua Kabupaten</option>
            {Object.entries(KABUPATEN_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <select
            value={selectedBulan2}
            onChange={e => setSelectedBulan2(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
          >
            {BULAN_NAMES.map((b, i) => <option key={i} value={i}>{b}</option>)}
          </select>
          <select
            value={selectedFase2}
            onChange={e => setSelectedFase2(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
          >
            {PHASE_OPTIONS.map(p => (
              <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>

        <div
          ref={map2Ref}
          className="rounded-xl overflow-hidden border border-border"
          style={{ height: "500px" }}
        />

        <div className="mt-4 flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Gradasi:</span>
          <div
            className="h-3 w-48 rounded-sm border border-border"
            style={{ background: `linear-gradient(to right, ${phaseColor}22, ${phaseColor})` }}
          />
          <span className="text-muted-foreground">0</span>
          <span className="text-muted-foreground ml-auto">Maks: {maxCount}</span>
        </div>
      </div>
    </div>
  );
};

export default PetaTab;
