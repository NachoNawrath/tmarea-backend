import json
import os

INPUT_OSM = "export.geojson"
OUTPUT_FILE = "red_nautica_chile_completa.geojson"

CANALES_INTERIORES = [
    {"type":"Feature","properties":{"name":"Canal de Chacao","waterway":"canal","source":"tmarea_custom","navigable":"yes"},"geometry":{"type":"LineString","coordinates":[[-73.450,-41.800],[-73.500,-41.805],[-73.550,-41.810],[-73.600,-41.800],[-73.680,-41.770]]}},
    {"type":"Feature","properties":{"name":"Golfo de Ancud","waterway":"canal","source":"tmarea_custom","navigable":"yes"},"geometry":{"type":"LineString","coordinates":[[-72.930,-41.480],[-73.000,-41.600],[-73.136,-41.773],[-73.160,-41.840],[-73.120,-41.910],[-73.050,-41.950],[-73.000,-42.100],[-73.000,-42.300]]}},
    {"type":"Feature","properties":{"name":"Canal Dalcahue","waterway":"canal","source":"tmarea_custom","navigable":"yes"},"geometry":{"type":"LineString","coordinates":[[-73.050,-41.950],[-73.250,-42.100],[-73.380,-42.230],[-73.550,-42.380],[-73.700,-42.480],[-73.780,-42.600],[-73.650,-42.750],[-73.500,-42.900]]}},
    {"type":"Feature","properties":{"name":"Golfo Corcovado","waterway":"canal","source":"tmarea_custom","navigable":"yes"},"geometry":{"type":"LineString","coordinates":[[-73.000,-42.300],[-73.050,-42.600],[-73.100,-42.900],[-73.200,-43.200],[-73.300,-43.500]]}},
    {"type":"Feature","properties":{"name":"Canal Moraleda","waterway":"canal","source":"tmarea_custom","navigable":"yes"},"geometry":{"type":"LineString","coordinates":[[-73.300,-43.500],[-73.400,-43.900],[-73.450,-44.300],[-73.500,-44.800],[-73.300,-45.200]]}}
]

CANALES_SALMONEROS = [
    {"type":"Feature","properties":{"name":"Seno Reloncavi","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-72.930,-41.480],[-72.750,-41.550],[-72.600,-41.650],[-72.380,-41.600],[-72.300,-41.450]]}},
    {"type":"Feature","properties":{"name":"Paso Hornopiren","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-72.750,-41.550],[-72.650,-41.850],[-72.500,-42.100],[-72.450,-42.300]]}},
    {"type":"Feature","properties":{"name":"Acceso Fiordo Castro","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-73.550,-42.380],[-73.700,-42.480],[-73.760,-42.470]]}},
    {"type":"Feature","properties":{"name":"Canal Yelcho","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-73.650,-42.600],[-73.500,-42.650],[-73.380,-42.550]]}},
    {"type":"Feature","properties":{"name":"Canal Jacaf","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-73.450,-44.300],[-72.950,-44.400],[-72.550,-44.500]]}},
    {"type":"Feature","properties":{"name":"Canal Puyuhuapi","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-72.950,-44.400],[-72.700,-44.250],[-72.580,-44.000]]}},
    {"type":"Feature","properties":{"name":"Fiordo Aysen","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-73.300,-45.200],[-73.100,-45.300],[-72.850,-45.400]]}},
    {"type":"Feature","properties":{"name":"Canal Guaitecas","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-73.500,-44.800],[-73.800,-45.000],[-73.900,-45.300]]}},
    {"type":"Feature","properties":{"name":"Canal Messier","waterway":"canal","source":"tmarea_custom","navigable":"yes","zone":"salmon"},"geometry":{"type":"LineString","coordinates":[[-73.300,-45.200],[-74.000,-46.500],[-74.300,-48.000],[-74.400,-49.500],[-74.500,-51.000]]}}
]

def main():
    with open(INPUT_OSM, "r", encoding="utf-8") as f:
        osm_data = json.load(f)
    features_osm = osm_data.get("features", [])
    custom_all = CANALES_INTERIORES + CANALES_SALMONEROS
    features_completas = features_osm + custom_all
    print(f"OSM: {len(features_osm)} + Custom: {len(custom_all)} = Total: {len(features_completas)}")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"type":"FeatureCollection","features":features_completas}, f, ensure_ascii=False, separators=(',',':'))
    print(f"Generado: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()