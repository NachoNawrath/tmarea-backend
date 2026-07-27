"""
Segundo escaneo liviano: busca keywords relevantes en el texto completo de
cada pagina (no solo los primeros 100 caracteres) y guarda listas de paginas
por categoria a disco. No imprime el texto en si.
"""
import pdfplumber
import re
import json

PDF_PATH = r"C:\Misil-Up\PROYECTOS\TMarea App\derrotero-3002-ano-2023_compress.pdf"
OUT_JSON = r"C:\Users\katia\tmarea-backend\tools\derrotero\muestras\_keyword_hits.json"

KEYWORDS = {
    "faro": r"\bfaro\b",
    "baliza": r"\bbaliza",
    "canal": r"\bcanal\b",
    "sonda": r"\bsonda",
    "braza": r"\bbraza",
    "metros_prof": r"\bmetro",
    "cable_ancho": r"\bcable",
    "coord_dms": r"\d{1,3}[°º]\s*\d{1,2}[,\.]?\d*['’]",
    "coord_coma": r"\d{1,3}[°º]\s*\d{1,2},\d+['’]",
    "latitud": r"\blatitud\b|\bLat\.",
    "longitud": r"\blongitud\b|\bLong\.",
    "calado": r"\bcalado\b",
    "indice": r"[ÍI]NDICE",
}

def main():
    hits = {k: [] for k in KEYWORDS}
    with pdfplumber.open(PDF_PATH) as pdf:
        n = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            low = text.lower()
            for key, pattern in KEYWORDS.items():
                if re.search(pattern, text if key.startswith("coord") or key == "indice" else low, re.IGNORECASE):
                    hits[key].append(i + 1)
            if (i + 1) % 100 == 0:
                print(f"procesadas {i+1}/{n}")
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(hits, f, ensure_ascii=False, indent=2)
    for k, v in hits.items():
        print(f"{k}: {len(v)} paginas -> primeras 10: {v[:10]}")

if __name__ == "__main__":
    main()
