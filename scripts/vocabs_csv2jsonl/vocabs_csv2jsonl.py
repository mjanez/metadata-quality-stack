#!/usr/bin/env python3
"""
Convert vocabulary CSV files to JSONL or JSON format, optionally fetching CSVs from a remote raw GitHub URL.
"""
import argparse
import csv
import io
import json
import sys
from pathlib import Path
from datetime import datetime
from urllib import request, error

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "vocabularies"
DST = ROOT / "react-app" / "public" / "data"

VOCABS = {
    "access_rights": {"type": "uri_label"},
    "file_types": {"type": "uri_label"},
    "licenses": {"type": "licenses"},
    "machine_readable": {"type": "uri_label"},
    "media_types": {"type": "uri_only"},
    "non_proprietary": {"type": "uri_label"},
}

def slug_label_from_uri(uri: str) -> str:
    if not uri:
        return ""
    u = uri.strip().rstrip("/#")
    last = u.split("/")[-1].split("#")[-1]
    return last.replace("_", " ").replace("-", " ").strip()

def read_csv_rows_from_path(path: Path):
    lines = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        for line in f:
            if line.lstrip().startswith("#") or not line.strip():
                continue
            lines.append(line)
    return _parse_csv_lines(lines)

def read_csv_rows_from_url(url: str):
    try:
        with request.urlopen(url) as resp:
            raw = resp.read()
    except error.URLError as e:
        raise RuntimeError(f"Error fetching {url}: {e}") from e
    text = raw.decode("utf-8-sig")
    # feed csv with lines
    lines = []
    for line in text.splitlines():
        if line.lstrip().startswith("#") or not line.strip():
            continue
        lines.append(line)
    return _parse_csv_lines(lines)

def _parse_csv_lines(lines):
    if not lines:
        return []
    first_line = lines[0].strip()
    has_header = not ("://" in first_line)  # URIs indicate data, not headers
    if has_header:
        reader = csv.DictReader(lines)
        return list(reader)
    else:
        rows = list(csv.reader(lines))
        if not rows:
            return []
        max_len = max(len(r) for r in rows)
        headers = [f"col{i}" for i in range(max_len)]
        result = []
        for r in rows:
            r_padded = list(r) + [""] * (max_len - len(r))
            result.append(dict(zip(headers, r_padded)))
        return result

def normalize_vocab_entry(vocab_name: str, row: dict) -> dict:
    if vocab_name == "media_types":
        uri = None
        for v in row.values():
            if v and v.strip():
                uri = v.strip()
                break
        return {"uri": uri} if uri else None

    elif vocab_name == "licenses":
        keys = {k.lower().strip(): (v.strip() if v else "") for k, v in row.items()}
        authority = keys.get("authority_uri") or keys.get("authority") or keys.get("col0", "")
        code = keys.get("code") or keys.get("id") or keys.get("col1", "")
        url = keys.get("url") or keys.get("license_url") or keys.get("col2", "")

        if not (url or code or authority):
            return None

        entry = {}
        if authority:
            entry["uri"] = authority
        if code:
            entry["code"] = code
        if url:
            entry["url"] = url

        entry["label"] = code or slug_label_from_uri(authority or url) or "Unknown"
        return entry

    else:
        keys = {k.lower().strip(): (v.strip() if v else "") for k, v in row.items()}
        uri = keys.get("uri") or keys.get("url") or keys.get("col0", "")
        label = keys.get("label") or keys.get("name") or keys.get("col1", "")
        equiv = keys.get("equivalent_uri") or keys.get("equivalent") or keys.get("col2", "")

        if not uri:
            return None

        entry = {"uri": uri}
        entry["label"] = label if label else slug_label_from_uri(uri)
        if equiv:
            entry["equivalentUri"] = equiv
        return entry

def convert_vocab(name: str, csv_source, output_path: Path, output_format: str, source_is_url: bool):
    """csv_source: Path (when local) or str (URL)"""
    source_desc = csv_source if source_is_url else str(Path(csv_source).relative_to(ROOT))
    metadata = {
        "source": source_desc,
        "generated": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "format": output_format,
        "type": VOCABS[name]["type"],
        "name": name
    }

    entries = []
    # read rows
    try:
        if source_is_url:
            rows = read_csv_rows_from_url(csv_source)
        else:
            rows = read_csv_rows_from_path(csv_source)
    except RuntimeError as e:
        print(f"WARNING: {e}", file=sys.stderr)
        return 0

    for row in rows:
        entry = normalize_vocab_entry(name, row)
        if entry:
            entries.append(entry)

    metadata["count"] = len(entries)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if output_format == "jsonl":
        with output_path.open("w", encoding="utf-8") as f:
            f.write(json.dumps(metadata, ensure_ascii=False) + "\n")
            for e in entries:
                f.write(json.dumps(e, ensure_ascii=False) + "\n")
    else:  # json
        out_obj = dict(metadata)  # copy
        out_obj["entries"] = entries
        with output_path.open("w", encoding="utf-8") as f:
            json.dump(out_obj, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return len(entries)

def main():
    p = argparse.ArgumentParser(description="Convert vocabulary CSVs to JSONL or JSON")
    p.add_argument("--remote-base",
                   help="Base raw URL where CSVs live, e.g. https://raw.githubusercontent.com/.../main/docs/vocabularies (default: GitHub raw URL)",
                   default="https://raw.githubusercontent.com/mjanez/metadata-quality-stack/refs/heads/main/docs/vocabularies")
    p.add_argument("--local", action="store_true",
                   help="Use local CSV files from docs/vocabularies instead of fetching remote (overrides --remote-base)")
    p.add_argument("--format", choices=("jsonl", "json"), default="jsonl",
                   help="Output format (jsonl or json). Default: jsonl")
    p.add_argument("--dst", help="Destination folder (optional)", default=str(DST))
    args = p.parse_args()

    remote_base = None if args.local else (args.remote_base.rstrip("/") if args.remote_base else None)
    out_dir = Path(args.dst)
    out_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    for name in VOCABS.keys():
        # determine source: remote URL if provided, else local file
        if remote_base:
            csv_url = f"{remote_base}/{name}.csv"
            # try remote first; if 404 or error, fall back to local
            try:
                count = convert_vocab(name, csv_url, out_dir / f"{name}.{args.format}", args.format, source_is_url=True)
                if count == 0:
                    # if zero entries maybe remote empty, try local fallback
                    local_csv = SRC / f"{name}.csv"
                    if local_csv.exists():
                        count = convert_vocab(name, local_csv, out_dir / f"{name}.{args.format}", args.format, source_is_url=False)
            except Exception as e:
                print(f"WARNING: Couldn't fetch remote {csv_url}: {e}", file=sys.stderr)
                local_csv = SRC / f"{name}.csv"
                if local_csv.exists():
                    count = convert_vocab(name, local_csv, out_dir / f"{name}.{args.format}", args.format, source_is_url=False)
                else:
                    print(f"WARNING: Missing CSV for {name}: remote failed and no local file", file=sys.stderr)
                    count = 0
        else:
            local_csv = SRC / f"{name}.csv"
            if not local_csv.exists():
                print(f"WARNING: Missing CSV: {local_csv}")
                count = 0
            else:
                count = convert_vocab(name, local_csv, out_dir / f"{name}.{args.format}", args.format, source_is_url=False)

        print(f"✔ {name}: {count} entries -> {out_dir / (name + '.' + args.format)}")
        total += count

    print(f"Done. Total entries: {total}")

if __name__ == "__main__":
    main()