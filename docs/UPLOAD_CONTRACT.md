# Upload and export contract

**Browser-supported input**: FASTA (.fa/.fasta/.fna/.fas), basic GenBank (.gb/.gbk/.genbank), and plain IUPAC DNA (.txt/.dna), ≤5 MB each. Uploaded originals go to a private bucket and get a SHA-256 metadata record, with partial failure explicitly reported.

**FASTA**: multiple record headers and their sequences are imported. Invalid letters stop import rather than being silently dropped. Names are limited to 160 characters in UI records.

**GenBank**: browser supports simple numeric feature locations and complement(simple range). Compound/join/fuzzy locations are refused until the Biopython-based full parser is connected to the interface. Do not claim these are supported by the browser.

**Exports**: FASTA and simple GenBank with 0-to-1-based coordinate conversion. Exports are not round-trip guarantees for advanced GenBank qualifiers or compound feature locations. No invented accession, taxonomy, or laboratory evidence is included.

**Other formats**: PDB/mmCIF, MOL/SDF, complex XML, CSV and microscopy files are not accepted as scientific uploads in this release. A future validated importer must announce its supported schema, retain original bytes and report parser warnings.
