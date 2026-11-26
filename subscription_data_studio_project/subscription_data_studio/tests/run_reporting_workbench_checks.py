#!/usr/bin/env python3
"""Run seeded reporting integration checks in macOS WebKit without changing saved user data."""
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--widths", type=int, nargs="+", default=[1440, 1024, 768])
parser.add_argument("--output", type=Path, default=ROOT / "reporting_workbench_checks.json")
args = parser.parse_args()
if sys.platform != "darwin" or not shutil.which("swift"):
    parser.error("These browser integration checks require macOS and Swift/WebKit.")
subprocess.run([sys.executable, str(ROOT / "build.py"), "--platform", "mac", "--sync-only"], cwd=ROOT, check=True)
with tempfile.TemporaryDirectory(prefix="studio-workbench-") as folder:
    work = Path(folder)
    html = (ROOT / "subscription_data_studio.html").read_text()
    start = html.index("  void restoreProjectDictionaryFile().finally")
    end = html.index("</script>", start)
    # Replace only auto-launch: checks execute inside the application closure with a seeded test dataset.
    hook = (ROOT / "tests/reporting_workbench_checks.js").read_text()
    (work / "app.html").write_text(html[:start] + hook + "\n})();\n" + html[end:])
    shutil.copy2(ROOT / "data_dictionary_definitions.js", work / "data_dictionary_definitions.js")
    runs = []
    for width in args.widths:
        output = work / f"results-{width}.json"
        subprocess.run(["swift", "-module-cache-path", str(Path(tempfile.gettempdir()) / "studio-reporting-swift-cache"), str(ROOT / "tests/reporting_browser_check.swift"), str(work / "app.html"), str(output), str(width)], check=True, timeout=300)
        runs.append(json.loads(output.read_text()))
    result = {"environment": "macOS WebKit", "dataset": {"users": 300, "history_days": 1825, "seed": 3280873347, "snapshot": "2026-11-23T12:00:00Z"}, "runs": runs}
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Passed {sum(len(run['checks']) for run in runs)} checks across {len(runs)} widths. Results: {args.output}")
