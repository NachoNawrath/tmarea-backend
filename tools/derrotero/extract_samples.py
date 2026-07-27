"""
Extrae el texto completo de un conjunto puntual de paginas (elegidas a partir
del indice/keyword scan) y las guarda como archivos individuales en muestras/.
Tambien guarda extract_tables() crudo para las paginas con tabla.
"""
import pdfplumber
import json

PDF_PATH = r"C:\Misil-Up\PROYECTOS\TMarea App\derrotero-3002-ano-2023_compress.pdf"
OUT_DIR = r"C:\Users\katia\tmarea-backend\tools\derrotero\muestras"

PAGES = {
    3: "indice",
    143: "canal_desc_1",
    155: "canal_desc_faro_baliza",
    149: "tabla_1",
    242: "tabla_2",
    154: "calado_baliza",
    288: "coord_coma",
    200: "random_200",
    400: "random_400",
    550: "random_550",
}

def main():
    with pdfplumber.open(PDF_PATH) as pdf:
        for pnum, label in PAGES.items():
            page = pdf.pages[pnum - 1]
            text = page.extract_text() or ""
            fname = f"{OUT_DIR}\\p{pnum:04d}_{label}.txt"
            with open(fname, "w", encoding="utf-8") as f:
                f.write(text)
            tables = page.extract_tables()
            if tables:
                tname = f"{OUT_DIR}\\p{pnum:04d}_{label}_tables.json"
                with open(tname, "w", encoding="utf-8") as f:
                    json.dump(tables, f, ensure_ascii=False, indent=2)
            print(f"p{pnum} ({label}): {len(text)} chars, {len(tables)} tablas")

if __name__ == "__main__":
    main()
