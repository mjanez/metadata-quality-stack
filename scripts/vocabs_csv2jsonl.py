#!/usr/bin/env python3
"""
Convert vocabulary CSV files to JSONL format for efficient streaming
"""
import csv
import json
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "vocabularies"
DST = ROOT / "static" / "data"

VOCABS = {
    "access_rights": {"type": "uri_label"},
    "file_types": {"type": "uri_label"},
    "licenses": {"type": "licenses"},
    "machine_readable": {"type": "uri_label"},
    "media_types": {"type": "uri_only"},
    "non_proprietary": {"type": "uri_label"},
}

def slug_label_from_uri(uri: str) -> str:
    """Extract label from URI"""
    if not uri:
        return ""
    u = uri.strip().rstrip("/#")
    last = u.split("/")[-1].split("#")[-1]
    return last.replace("_", " ").replace("-", " ").strip()

def read_csv_rows(path: Path):
    """Read CSV with UTF-8 BOM support and header detection"""
    lines = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        for line in f:
            if line.lstrip().startswith("#") or not line.strip():
                continue
            lines.append(line)
    
    if not lines:
        return []
    
    # Check if first line looks like a header or data
    first_line = lines[0].strip()
    has_header = not ("://" in first_line)  # URIs indicate data, not headers
    
    if has_header:
        reader = csv.DictReader(lines)
        return list(reader)
    else:
        # No header, use positional columns
        rows = list(csv.reader(lines))
        if not rows:
            return []
        max_len = max(len(r) for r in rows)
        headers = [f"col{i}" for i in range(max_len)]
        result = []
        for r in rows:
            # Pad short rows
            r_padded = list(r) + [""] * (max_len - len(r))
            result.append(dict(zip(headers, r_padded)))
        return result

def normalize_vocab_entry(vocab_name: str, row: dict) -> dict:
    """Normalize CSV row to standard vocabulary entry"""
    if vocab_name == "media_types":
        # Single URI column
        uri = None
        for v in row.values():
            if v and v.strip():
                uri = v.strip()
                break
        return {"uri": uri} if uri else None
    
    elif vocab_name == "licenses":
        # Handle complex license structure - use uri as primary field for consistency
        keys = {k.lower().strip(): (v.strip() if v else "") for k, v in row.items()}
        authority = keys.get("authority_uri") or keys.get("authority") or keys.get("col0", "")
        code = keys.get("code") or keys.get("id") or keys.get("col1", "")
        url = keys.get("url") or keys.get("license_url") or keys.get("col2", "")
        
        if not (url or code or authority):
            return None
            
        entry = {}
        # Use authority as uri for consistency with other vocabularies
        if authority:
            entry["uri"] = authority
        if code:
            entry["code"] = code
        if url:
            entry["url"] = url
        
        # Generate label
        entry["label"] = code or slug_label_from_uri(authority or url) or "Unknown"
        return entry
    
    else:
        # Standard uri_label format
        keys = {k.lower().strip(): (v.strip() if v else "") for k, v in row.items()}
        uri = keys.get("uri") or keys.get("url") or keys.get("col0", "")
        label = keys.get("label") or keys.get("name") or keys.get("col1", "")
        equiv = keys.get("equivalent_uri") or keys.get("equivalent") or keys.get("col2", "")
        
        if not uri:
            return None
            
        entry = {"uri": uri}
        if label:
            entry["label"] = label
        else:
            entry["label"] = slug_label_from_uri(uri)
        if equiv:
            entry["equivalentUri"] = equiv
            
        return entry

def convert_to_jsonl(name: str, csv_path: Path, output_path: Path):
    """Convert CSV to JSONL format for efficient streaming"""
    metadata = {
        "source": str(csv_path.relative_to(ROOT)),
        "generated": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "format": "jsonl",
        "type": VOCABS[name]["type"],
        "name": name
    }
    
    count = 0
    with output_path.open('w', encoding='utf-8') as jsonl_file:
        # First line: metadata
        jsonl_file.write(json.dumps(metadata, ensure_ascii=False) + '\n')
        
        # Process CSV rows
        rows = read_csv_rows(csv_path)
        for row in rows:
            entry = normalize_vocab_entry(name, row)
            if entry:
                jsonl_file.write(json.dumps(entry, ensure_ascii=False) + '\n')
                count += 1
    
    # Update metadata with final count
    lines = output_path.read_text(encoding='utf-8').splitlines()
    metadata["count"] = count
    lines[0] = json.dumps(metadata, ensure_ascii=False)
    output_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    
    return count

def main():
    if not SRC.exists():
        print(f"ERROR: Source folder not found: {SRC}", file=sys.stderr)
        sys.exit(1)
    
    DST.mkdir(parents=True, exist_ok=True)
    total = 0
    
    for name in VOCABS.keys():
        csv_file = SRC / f"{name}.csv"
        if not csv_file.exists():
            print(f"WARNING: Missing CSV: {csv_file}")
            continue
            
        jsonl_file = DST / f"{name}.jsonl"
        count = convert_to_jsonl(name, csv_file, jsonl_file)
        print(f"✔ {name}: {count} entries -> {jsonl_file.relative_to(ROOT)}")
        total += count
    
    print(f"Done. Total entries: {total}")

if __name__ == "__main__":
    main()