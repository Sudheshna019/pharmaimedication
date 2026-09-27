"""Build shared/drug_vocabulary.json from ml/drug_catalog.py.

For every generic drug:
  1. fetch its structure (SMILES, InChIKey, formula, CID) from PubChem
  2. find the same molecule in the DrugBank DDI dataset by InChIKey, and keep
     that DrugBank ID + the exact SMILES the DDI model was trained on

Usage:  python -m ml.build_vocabulary
PubChem responses are cached in ml/cache/pubchem.json.
"""
from __future__ import annotations

import json
import sys
import time
import subprocess
import urllib.parse
from pathlib import Path

import pandas as pd
from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ml.drug_catalog import COMBINATIONS, GENERICS, NON_CHEMICAL_PRODUCTS, SALT_WORDS  # noqa: E402
from ml.paths import DDI_RAW, SHARED_DIR  # noqa: E402

RDLogger.DisableLog("rdApp.*")
CACHE = Path(__file__).resolve().parent / "cache" / "pubchem.json"
# Substance names that are also everyday words - never treated as medicines in OCR text
COMMON_WORDS = {"water", "oxygen", "glucose", "dextrose", "sucrose", "ethanol", "alcohol", "urea", "iron", "copper",
                "zinc", "gold", "silver", "sodium", "calcium", "magnesium", "chloride", "nitrogen", "carbon", "helium",
                "caffeine", "menthol", "glycerin", "glycerol", "salt", "sugar", "vitamin", "acetone", "ammonia",
                "chlorine", "iodine", "fluoride", "phosphate", "lactose", "starch", "citric acid", "acetic acid"}
PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{}/property/SMILES,InChIKey,MolecularFormula/JSON"


def pubchem_lookup(name: str, cache: dict) -> dict | None:
    if cache.get(name):
        return cache[name]
    url = PUBCHEM.format(urllib.parse.quote(name))
    err = None
    for attempt in range(6):
        time.sleep(0.4 + 2 * attempt)  # PubChem allows max 5 requests / second; back off when busy
        # curl is used because PubChem's load balancer rejects Python's urllib client
        r = subprocess.run(["curl", "-s", "-m", "30", "-w", "|HTTP%{http_code}", url],
                           capture_output=True, text=True)
        body, _, code = r.stdout.rpartition("|HTTP")
        if code == "200":
            props = json.loads(body)["PropertyTable"]["Properties"][0]
            cache[name] = {"cid": props["CID"], "smiles": props.get("SMILES") or props.get("IsomericSMILES"),
                           "inchikey": props["InChIKey"], "formula": props["MolecularFormula"]}
            CACHE.write_text(json.dumps(cache, indent=1))
            print(f"  {name}: CID {props['CID']}", flush=True)
            return cache[name]
        if code == "404":
            break
        err = f"HTTP {code}"
    else:
        print(f"  PubChem lookup failed for {name!r}: {err}")
        return None
    print(f"  PubChem has no compound named {name!r}")
    return None


def largest_fragment_key(smiles: str) -> str | None:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    frags = Chem.GetMolFrags(mol, asMols=True)
    main = max(frags, key=lambda m: m.GetNumHeavyAtoms())
    return Chem.MolToInchiKey(main)


def drugbank_index():
    frames = []
    for f in ["drugbank_training.csv", "drugbank_validation.csv", "drugbank_test (1).csv"]:
        df = pd.read_csv(DDI_RAW / f, usecols=["d1", "d2", "smiles1", "smiles2"])
        frames += [df[["d1", "smiles1"]].set_axis(["id", "smiles"], axis=1),
                   df[["d2", "smiles2"]].set_axis(["id", "smiles"], axis=1)]
    drugs = pd.concat(frames).drop_duplicates("id")
    full, block = {}, {}
    for dbid, smi in zip(drugs.id, drugs.smiles):
        key = largest_fragment_key(smi)
        if not key:
            continue
        full.setdefault(key, (dbid, smi))
        block.setdefault(key[:14], (dbid, smi))
    print(f"DrugBank DDI dataset: {len(drugs)} unique drugs indexed")
    return full, block


def main():
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    CACHE.parent.mkdir(exist_ok=True)
    full, block = drugbank_index()

    drugs, unmatched = {}, []
    for generic, (drug_class, synonyms, query) in GENERICS.items():
        pc = pubchem_lookup(query or generic, cache)
        entry = {"name": generic.title(), "class": drug_class, "synonyms": synonyms,
                 "pubchem_cid": None, "drugbank_id": None, "smiles": None, "formula": None,
                 "in_ddi_dataset": False}
        if pc:
            entry.update(pubchem_cid=pc["cid"], smiles=pc["smiles"], formula=pc["formula"])
            key = largest_fragment_key(pc["smiles"]) or pc["inchikey"]
            match = full.get(key) or block.get(key[:14])
            if match:
                # exact = the whole PubChem molecule (not just its largest fragment) is the DrugBank molecule
                exact = pc["inchikey"] == Chem.MolToInchiKey(Chem.MolFromSmiles(match[1]))
                entry.update(drugbank_id=match[0], smiles=match[1], in_ddi_dataset=True, exact_match=exact)
                mol = Chem.MolFromSmiles(match[1])
                entry["formula"] = CalcMolFormula(mol) if mol else entry["formula"]
            else:
                unmatched.append(generic)
        else:
            unmatched.append(generic)
        drugs[generic] = entry
    CACHE.write_text(json.dumps(cache, indent=1))

    # Two generics sharing one DrugBank ID (e.g. lithium carbonate / calcium carbonate, whose largest
    # fragment is the carbonate ion): keep the exact match and fall back to PubChem for the other.
    by_id = {}
    for g, d in drugs.items():
        if d["drugbank_id"]:
            by_id.setdefault(d["drugbank_id"], []).append(g)
    for dbid, gs in by_id.items():
        if len(gs) > 1:
            keep = next((g for g in gs if drugs[g].get("exact_match")), gs[0])
            for g in gs:
                if g != keep:
                    pc = cache[GENERICS[g][2] or g]
                    drugs[g].update(drugbank_id=None, in_ddi_dataset=False, smiles=pc["smiles"], formula=pc["formula"])
                    unmatched.append(g)
                    print(f"  {g}: shared {dbid} with {keep}; using PubChem structure instead")
    for d in drugs.values():
        d.pop("exact_match", None)

    # All other DrugBank dataset drugs, named via PubChem (ml/fetch_drugbank_names.py).
    # Matched by exact name only (no spelling correction) to avoid false matches in OCR text.
    names_file = CACHE.parent / "drugbank_names.json"
    extended = 0
    if names_file.exists():
        used_ids = {d["drugbank_id"] for d in drugs.values() if d["drugbank_id"]}
        known_keys = set(drugs) | {s.lower() for d in drugs.values() for s in d["synonyms"]} | set(COMBINATIONS)
        for dbid, info in json.loads(names_file.read_text()).items():
            title = (info.get("title") or "").strip()
            key = title.lower()
            if (dbid in used_ids or not title or not (4 <= len(key) <= 30) or len(key.split()) > 3
                    or not all(c.isalpha() or c in " -" for c in key) or key in known_keys or key in COMMON_WORDS):
                continue
            mol = Chem.MolFromSmiles(info["smiles"])
            drugs[key] = {"name": title[0].upper() + title[1:], "class": None, "synonyms": [],
                          "pubchem_cid": None, "drugbank_id": dbid, "smiles": info["smiles"],
                          "formula": CalcMolFormula(mol) if mol else None, "in_ddi_dataset": True,
                          "extended": True}
            known_keys.add(key)
            extended += 1
    print(f"added {extended} more DrugBank drugs by name")

    vocab = {
        "description": "Drug-name normalisation dictionary generated by ml/build_vocabulary.py. "
                       "Structures from PubChem, IDs/SMILES from the DrugBank DDI dataset.",
        "drugs": drugs,
        "combinations": {brand: {"name": brand.title(), "components": comps}
                         for brand, comps in COMBINATIONS.items()},
        "non_chemical_products": {k: {"name": name, "class": cls}
                                  for k, (cls, name) in NON_CHEMICAL_PRODUCTS.items()},
        "salt_words": SALT_WORDS,
    }
    for brand, comps in COMBINATIONS.items():
        missing = [c for c in comps if c not in drugs]
        assert not missing, f"{brand}: unknown components {missing}"

    out = SHARED_DIR / "drug_vocabulary.json"
    out.write_text(json.dumps(vocab, indent=1, ensure_ascii=False))
    matched = sum(d["in_ddi_dataset"] for d in drugs.values())
    print(f"{len(drugs)} generics, {matched} matched to DrugBank DDI dataset, "
          f"{sum(d['smiles'] is not None for d in drugs.values())} with a structure")
    print("not in DDI dataset:", unmatched)
    print(f"written {out}")


if __name__ == "__main__":
    main()
