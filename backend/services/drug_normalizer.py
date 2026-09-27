"""Drug-name normalisation: brand / misspelt / salt-form names -> generic ingredients.

Backed by shared/drug_vocabulary.json (built by ml/build_vocabulary.py). The same
dictionary and the same matching rules are used by the TypeScript OCR parser
(src/utils/prescriptionParser.ts).
"""
from __future__ import annotations

import difflib
import json
import re
from functools import lru_cache
from pathlib import Path

VOCAB_PATH = Path(__file__).resolve().parents[2] / "shared" / "drug_vocabulary.json"

FORM_WORDS = {"tab", "tabs", "tablet", "tablets", "cap", "caps", "capsule", "capsules", "syp", "syrup",
              "inj", "injection", "susp", "suspension", "oral", "drops", "gel", "cream", "t", "c",
              "mg", "mcg", "g", "ml", "iu", "meq", "units", "rx"}
FUZZY_MIN_LEN = 5
FUZZY_CUTOFF = 0.86


def _clean(text: str) -> str:
    t = text.lower()
    t = re.sub(r"(\d)([a-z])", r"\1 \2", t)          # 40mg -> 40 mg
    t = re.sub(r"[^a-z0-9+ ]+", " ", t)                # punctuation -> space (pan-40 -> pan 40)
    return re.sub(r"\s+", " ", t).strip()


class DrugNormalizer:
    def __init__(self, path: Path = VOCAB_PATH):
        vocab = json.loads(Path(path).read_text(encoding="utf-8"))
        self.drugs: dict = vocab["drugs"]
        self.combos: dict = vocab["combinations"]
        self.non_chemical: dict = vocab["non_chemical_products"]
        self.salt_words = set(vocab["salt_words"])
        # lookup key -> (kind, target)
        self.lookup: dict[str, tuple[str, str]] = {}
        for g, d in self.drugs.items():
            self.lookup[_clean(g)] = ("generic", g)
            for s in d["synonyms"]:
                self.lookup.setdefault(_clean(s), ("brand", g))
        for brand in self.combos:
            self.lookup[_clean(brand)] = ("combination", brand)
        for name in self.non_chemical:
            self.lookup.setdefault(_clean(name), ("non_chemical", name))
        # OCR often drops the space in short brand names: "Pan D" -> "PanD", "Pan 40" -> "Pan40"
        for key, value in list(self.lookup.items()):
            joined = key.replace(" ", "")
            if " " in key and len(joined) >= 4:
                self.lookup.setdefault(joined, value)
        self.max_ngram = max(len(k.split()) for k in self.lookup)
        # spelling correction only for the curated drugs (the extended DrugBank names match exactly)
        self.single_word_keys = [k for k, (kind, target) in self.lookup.items()
                                 if " " not in k and len(k) >= FUZZY_MIN_LEN
                                 and not self.drugs.get(target, {}).get("extended")]

    # ---- vocabulary accessors -------------------------------------------------
    def generics(self) -> list[str]:
        return list(self.drugs)

    def all_classes(self) -> set[str]:
        return ({d["class"] for d in self.drugs.values()} | {v["class"] for v in self.non_chemical.values()}) - {None}

    def drug_class(self, name: str) -> str | None:
        if name in self.drugs:
            return self.drugs[name]["class"]
        if name in self.non_chemical:
            return self.non_chemical[name]["class"]
        return None

    def aliases(self, generic: str) -> list[str]:
        return list(self.drugs.get(generic, {}).get("synonyms", []))

    def smiles(self, generic: str) -> str | None:
        return self.drugs.get(generic, {}).get("smiles")

    def drugbank_id(self, generic: str) -> str | None:
        return self.drugs.get(generic, {}).get("drugbank_id")

    def display_name(self, generic: str) -> str:
        if generic in self.drugs:
            return self.drugs[generic]["name"]
        if generic in self.non_chemical:
            return self.non_chemical[generic]["name"]
        return generic.title()

    # ---- matching -------------------------------------------------------------
    def _resolve(self, kind: str, target: str) -> list[str]:
        if kind == "combination":
            return list(self.combos[target]["components"])
        return [target]

    def _fuzzy(self, token: str) -> tuple[str, str] | None:
        if len(token) < FUZZY_MIN_LEN or token in FORM_WORDS or token in self.salt_words:
            return None
        best = difflib.get_close_matches(token, self.single_word_keys, n=1, cutoff=FUZZY_CUTOFF)
        return self.lookup[best[0]] if best else None

    def find_in_text(self, text: str, fuzzy: bool = True) -> list[dict]:
        """All drug mentions in a piece of text, longest match first, left to right."""
        tokens = _clean(text).split()
        found, i = [], 0
        while i < len(tokens):
            hit = None
            for n in range(min(self.max_ngram, len(tokens) - i), 0, -1):
                key = " ".join(tokens[i:i + n])
                if key in self.lookup:
                    hit = (n, *self.lookup[key], key, False)
                    break
            if hit is None:
                # OCR sometimes glues the dosage form to the name: "tabpand", "capzoclar"
                glued = re.match(r"^(tab|tabs|cap|caps|inj|syp|syr)([a-z0-9]{3,})$", tokens[i])
                if glued and glued.group(2) in self.lookup:
                    hit = (1, *self.lookup[glued.group(2)], glued.group(2), False)
            if hit is None and fuzzy:
                fz = self._fuzzy(tokens[i])
                if fz:
                    hit = (1, *fz, tokens[i], True)
            if hit:
                n, kind, target, matched_text, is_fuzzy = hit
                found.append({"kind": kind, "key": target, "generics": self._resolve(kind, target),
                              "matched_text": matched_text, "fuzzy": is_fuzzy})
                i += n
                while i < len(tokens) and tokens[i] in self.salt_words:  # "losartan potassium"
                    i += 1
            else:
                i += 1
        return found

    @lru_cache(maxsize=4096)
    def normalize_name(self, name: str) -> dict:
        """Normalise one medicine entry (e.g. 'Tab. Pantocid 40mg')."""
        hits = self.find_in_text(name)
        if not hits:
            return {"input": name, "recognized": False, "generics": [], "kind": None,
                    "display": name.strip(), "classes": []}
        generics = []
        for h in hits:
            generics += [g for g in h["generics"] if g not in generics]
        first = hits[0]
        if first["kind"] == "combination":
            label = self.combos[first["key"]]["name"]
            display = f"{label} ({' + '.join(self.display_name(g) for g in generics)})"
        elif first["kind"] == "brand":
            display = f"{first['matched_text'].title()} ({self.display_name(generics[0])})"
        else:
            display = self.display_name(generics[0])
        return {"input": name, "recognized": True, "generics": generics, "kind": first["kind"],
                "display": display, "classes": [self.drug_class(g) for g in generics],
                "fuzzy": any(h["fuzzy"] for h in hits)}

    def normalize_faers(self, raw: str) -> list[str]:
        """FAERS drug string -> generic names (unknown drugs keep their cleaned name)."""
        hits = self.find_in_text(raw, fuzzy=False)
        if hits:
            out = []
            for h in hits:
                out += h["generics"]
            return out
        tokens = [t for t in _clean(raw).split() if t not in self.salt_words]
        return [" ".join(tokens)] if tokens else []


@lru_cache(maxsize=1)
def get_normalizer() -> DrugNormalizer:
    return DrugNormalizer()
