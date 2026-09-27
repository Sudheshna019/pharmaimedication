"""Look up the generic name of every drug in the DrugBank DDI dataset on PubChem.

The DDI dataset only has DrugBank IDs + SMILES. This script finds each molecule's PubChem
title (its common generic name) by InChIKey, so the app can recognise all ~1,700 dataset
drugs by name, not only the hand-curated ones.

Usage:  python -m ml.fetch_drugbank_names      -> ml/cache/drugbank_names.json
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd
from rdkit import Chem, RDLogger

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ml.paths import DDI_RAW  # noqa: E402

RDLogger.DisableLog("rdApp.*")
OUT = Path(__file__).resolve().parent / "cache" / "drugbank_names.json"
URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/{}/property/Title/JSON"


def curl_json(url: str):
    # curl is used because PubChem's load balancer rejects Python's urllib client
    for attempt in range(5):
        time.sleep(0.3 + 1.5 * attempt)
        r = subprocess.run(["curl", "-s", "-m", "30", "-w", "|HTTP%{http_code}", url], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition("|HTTP")
        if code == "200":
            return json.loads(body)
        if code == "404":
            return None
    return None


def lookup(item):
    dbid, smiles = item
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return dbid, None
    data = curl_json(URL.format(urllib.parse.quote(Chem.MolToInchiKey(mol))))
    if not data:
        return dbid, None
    return dbid, data["PropertyTable"]["Properties"][0].get("Title")


def main():
    frames = []
    for f in ["drugbank_training.csv", "drugbank_validation.csv", "drugbank_test (1).csv"]:
        df = pd.read_csv(DDI_RAW / f, usecols=["d1", "d2", "smiles1", "smiles2"])
        frames += [df[["d1", "smiles1"]].set_axis(["id", "smiles"], axis=1),
                   df[["d2", "smiles2"]].set_axis(["id", "smiles"], axis=1)]
    drugs = pd.concat(frames).drop_duplicates("id")
    done = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [(i, s) for i, s in zip(drugs.id, drugs.smiles) if i not in done]
    print(f"{len(drugs)} drugs, {len(todo)} to look up", flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        for n, (dbid, title) in enumerate(pool.map(lookup, todo), 1):
            done[dbid] = {"title": title, "smiles": dict(zip(drugs.id, drugs.smiles))[dbid]}
            if n % 50 == 0:
                OUT.write_text(json.dumps(done))
                print(f"  {n}/{len(todo)}", flush=True)
    OUT.write_text(json.dumps(done))
    print(f"named: {sum(1 for v in done.values() if v['title'])}/{len(done)}")


if __name__ == "__main__":
    main()
