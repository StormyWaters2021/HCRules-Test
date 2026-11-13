"""Import the 89 published HCUnits team ability SVGs into local assets.

Run from the repository root: python scripts/import_team_abilities.py
"""
from pathlib import Path
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET
import json
import time

BASE = "https://storage.googleapis.com/static.hcunits.net/images/ta/"
CODES = [
  "team_player",
  "police",
  "mystics",
  "snowfall",
  "cosmic_energy",
  "underworld",
  "injustice_league",
  "batman_ally",
  "batman_enemy",
  "calculator",
  "crime_syndicate",
  "green_lantern_corps",
  "hypertime",
  "justice_league",
  "justice_society",
  "kingdom_come",
  "legion_of_super_heroes",
  "outsiders",
  "quintessence",
  "suicide_squad",
  "superman_ally",
  "superman_enemy",
  "titans",
  "watchmen",
  "wonder_woman_ally",
  "ultimates",
  "wakanda",
  "x_men",
  "avengers_initiative",
  "morlocks",
  "ultimate_x_men",
  "sinister_syndicate",
  "power_cosmic",
  "brotherhood_of_mutants",
  "avengers",
  "defenders",
  "fantastic_four",
  "guardians",
  "hydra",
  "masters_of_evil",
  "minions_of_doom",
  "serpent_society",
  "skrulls",
  "spider_man",
  "shield",
  "templars",
  "assassins",
  "vox_populi",
  "founders",
  "coalition_of_ordered_governments",
  "locust_horde",
  "covenant_empire",
  "united_nations_space_command",
  "danger_girl",
  "freedom_phalanx",
  "guardians_of_the_globe",
  "kabuki",
  "the_alliance",
  "top_cow",
  "2000_ad",
  "arachnos",
  "bprd",
  "crossgen",
  "crusade",
  "council_of_the_mists",
  "ascendent",
  "mage_spawn",
  "phoenix_concord",
  "mercenary",
  "dominion_pact",
  "kaiju",
  "pan_pacific_defense_corps",
  "federation_support_team",
  "borg",
  "cardassian_union",
  "united_federation",
  "ferengi_alliance",
  "klingon_empire",
  "mirror_universe",
  "q_continuum",
  "romulan_star_empire",
  "federation_away_team",
  "borg_tactics",
  "romulan_star_empire_tactics",
  "federation",
  "klingon_empire_tactics",
  "dominion",
  "street_fighter",
  "wwe"
]
DEST = Path(__file__).resolve().parents[1] / "assets" / "team-abilities"
assert len(CODES) == len(set(CODES)) == 89

def download(code):
    url = BASE + code + ".svg"
    error = None
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "HCRules-asset-import/1.0"})
            with urlopen(request, timeout=25) as response:
                payload = response.read(512_000)
            if not payload or len(payload) > 500_000:
                raise ValueError("SVG is missing or exceeds size limit")
            root = ET.fromstring(payload)
            if root.tag.rsplit("}", 1)[-1] != "svg":
                raise ValueError("Expected SVG root, got " + root.tag)
            return payload
        except Exception as exc:
            error = exc
            if attempt < 2:
                time.sleep(1 + attempt)
    raise RuntimeError(f"{code}: {error}")

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    failures = []
    for number, code in enumerate(CODES, 1):
        try:
            payload = download(code)
            (DEST / (code + ".svg")).write_bytes(payload)
            print(f"[{number:02d}/89] OK {code}.svg ({len(payload)} bytes)", flush=True)
        except Exception as exc:
            failures.append(str(exc))
            print(f"[{number:02d}/89] FAIL {exc}", flush=True)
    manifest = {"source": BASE, "identifiers": CODES,
                "verified": [c for c in CODES if (DEST / (c + ".svg")).is_file()]}
    (DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    if failures:
        raise SystemExit("Failed to import all icons:\n" + "\n".join(failures))
    print("Validated all 89 official team ability SVG files.")

if __name__ == "__main__":
    main()
