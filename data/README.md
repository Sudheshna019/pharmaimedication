# data/

| Folder | Content |
|---|---|
| `sample_prescriptions/` | 14 printed e-prescription images used for demos and OCR tests |
| `test_images/` | 2 extra prescriptions made only for testing (different layout, rotation, blur, brand names) |
| `samples/` | small real extracts of the training datasets (the full datasets are too large for the repository) |

`samples/` files:

* `drugbank_ddi_test_sample.csv` – 300 rows of the DrugBank DDI test split (drug IDs, SMILES, interaction type + description)
* `ddi_interacts_vs_not_sample.csv` – 300 rows of `all_ddi_data.csv` (label 1 = interacting, 0 = not)
* `ddi_class_distribution.csv` – number of pairs per interaction type in the full 191,870-pair DrugBank dataset (class imbalance)
* `faers_reports_sample.csv` – 300 FAERS reports (age, sex, drugs, reactions) used for the ADR models
* `sider_frequency_sample.csv` – 300 rows of SIDER 4.1 `meddra_freq.tsv`
