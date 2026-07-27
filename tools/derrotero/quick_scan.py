"""
Escaneo liviano del Derrotero SHOA: recorre todas las paginas UNA vez,
sin acumular texto en memoria, y escribe un indice a disco con:
  pagina, cantidad de caracteres, cantidad de tablas detectadas, primeras 100 chars.

No imprime el texto completo por stdout (evita llenar el contexto del agente).
"""
import pdfplumber
import sys
import re

PDF_PATH = r"C:\Misil-Up\PROYECTOS\TMarea App\derrotero-3002-ano-2023_compress.pdf"
OUT_INDEX = r"C:\Users\katia\tmarea-backend\tools\derrotero\muestras\_indice_paginas.tsv"

def main():
    with pdfplumber.open(PDF_PATH) as pdf:
        n = len(pdf.pages)
        sys.stderr.write(f"Total paginas: {n}\n")
        with open(OUT_INDEX, "w", encoding="utf-8") as out:
            out.write("pagina\tn_chars\tn_tablas\tprimeros_100\n")
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                try:
                    tables = page.extract_tables()
                    n_tables = len(tables)
                except Exception:
                    n_tables = -1
                preview = re.sub(r"\s+", " ", text[:100]).strip()
                out.write(f"{i+1}\t{len(text)}\t{n_tables}\t{preview}\n")
                if (i + 1) % 50 == 0:
                    sys.stderr.write(f"  procesadas {i+1}/{n}\n")
    sys.stderr.write("Listo.\n")

if __name__ == "__main__":
    main()
