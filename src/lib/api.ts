const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVzgu7BbbbcwJdTrTAa1QHfmAd3ZFGPnQwxzgK5wUPZd2BfdCIFhTQeRi7q2_icnmN9w/exec';
const API_URL = 'https://script.google.com/macros/s/AKfycbx6y99wUJIR2Ex9yyZK2yaAZMvxQuqHS3ZY9d5C0D-yjaWak8jL_RM4h1FzDS20fs2j/exec';

export const COLORS: Record<string, string> = {
  "Tidak diamati": "#BDBDBD",
  "Vegetatif Awal": "#8BC34A",
  "Vegetatif Akhir": "#4CAF50",
  "Reproduktif Awal": "#FFC107",
  "Reproduktif Akhir": "#FF9800",
  "Panen Hijauan": "#795548",
  "Panen Muda": "#FF5722",
  "Panen Pipilan": "#E91E63",
  "Persiapan Lahan": "#03A9F4",
  "Lahan Pertanian Bukan Jagung": "#9E9E9E",
  "Bukan Lahan Pertanian": "#607D8B",
  "Puso": "#000000",
  "Bera": "#9C27B0"
};

export const PHASE_DESCRIPTIONS: Record<number, string> = {
  5: "Panen Hijauan",
  6: "Panen Muda",
  7: "Panen Pipilan"
};

export const BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export async function fetchSheetsList(): Promise<string[]> {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getSheets`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching sheets list:', error);
    return [];
  }
}

export async function fetchSheetData(sheetName: string): Promise<any[]> {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getData&sheet=${sheetName}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

export async function fetchApiData(): Promise<any> {
  const response = await fetch(API_URL);
  return await response.json();
}

export async function fetchRawData(sheetName: string): Promise<any[]> {
  const response = await fetch(`${API_URL}?action=getRawData&sheet=${encodeURIComponent(sheetName)}`);
  return await response.json();
}

export interface Metrics {
  jumlahSegmen: number;
  jumlahSubsegmen: number;
  jumlahSubsegmenPanen: number;
  jumlahSubsegmenBera: number;
  jumlahSubsegmenBukanLahan: number;
  jumlahSubsegmenBukanJagung: number;
}

export function calculateMetrics(data: any[], bulanIndex: number | null = null): Metrics {
  const subSegmenSet = new Set<string>();
  const panenSet = new Set<string>();
  const beraSet = new Set<string>();
  const bukanLahanSet = new Set<string>();
  const bukanJagungSet = new Set<string>();

  data.forEach(row => {
    const subseg = row.B || row['ID-Subsegmen'];
    if (subseg) subSegmenSet.add(subseg);

    const bulanIndices = bulanIndex !== null ? [bulanIndex + 3] : Array.from({ length: 12 }, (_, i) => i + 3);

    bulanIndices.forEach(i => {
      const colName = String.fromCharCode(65 + i);
      const nilai = parseInt(row[colName] || row[Object.keys(row)[i]] || 0);

      if ([5, 6, 7].includes(nilai)) panenSet.add(subseg);
      if (nilai === 15) beraSet.add(subseg);
      if (nilai === 10) bukanLahanSet.add(subseg);
      if (nilai === 9) bukanJagungSet.add(subseg);
    });
  });

  return {
    jumlahSegmen: Math.floor(subSegmenSet.size / 4),
    jumlahSubsegmen: subSegmenSet.size,
    jumlahSubsegmenPanen: panenSet.size,
    jumlahSubsegmenBera: beraSet.size,
    jumlahSubsegmenBukanLahan: bukanLahanSet.size,
    jumlahSubsegmenBukanJagung: bukanJagungSet.size
  };
}
