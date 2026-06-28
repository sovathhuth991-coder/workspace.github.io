"""
patch_schedule.py  — fixes the timer-link button insertion in schedule-planner.js

Usage:
    python patch_schedule.py                          # looks for schedule-planner.js relative to this script
    python patch_schedule.py "path/to/schedule-planner.js"   # explicit path

Changes from original:
  - FIX: Removed hardcoded absolute Windows path; resolves relative to this script by default
  - FIX: Creates a .bak backup before modifying the file
  - FIX: Patches ALL occurrences of timeline-item-actions, not just the first
  - FIX: Added error handling for missing file and missing pattern
"""

import pathlib
import shutil
import sys


def build_correct_line() -> str:
    """Return the correctly-escaped timer button HTML string to inject."""
    return (
        '                <button class="timeline-btn timer-link"'
        " onclick=\"startTimerWithTask("
        "'${ev.title.replace(/\\'/g, \"\\\\'\")}',"
        " '${ev.start}',"
        " '${ev.end}')"
        ' " title="Start Focus Timer">⏱</button>'
    )


def patch_file(path: pathlib.Path) -> None:
    if not path.exists():
        print(f"ERROR: File not found: {path}")
        sys.exit(1)

    # FIX: Back up before overwriting so a bad run is recoverable
    backup = path.with_suffix(".js.bak")
    shutil.copy(path, backup)
    print(f"Backup saved → {backup}")

    lines = path.read_text(encoding="utf-8").splitlines()
    correct = build_correct_line()
    patched_count = 0

    i = 0
    # FIX: Iterate all lines (not just the first match) so every occurrence is patched
    while i < len(lines):
        if "timeline-item-actions" in lines[i]:
            # Remove any already-broken timer-link lines inserted after this line
            j = i + 1
            while j < min(i + 6, len(lines)):
                if "timer-link" in lines[j] and "Start Focus Timer" in lines[j]:
                    del lines[j]
                    # don't advance j — the next element shifted down
                else:
                    j += 1

            # Insert the correct button line right after the marker
            lines.insert(i + 1, correct)
            patched_count += 1
            i += 2  # skip past the line we just inserted
        else:
            i += 1

    # FIX: Warn explicitly if the pattern was never found
    if patched_count == 0:
        print(
            'WARNING: No "timeline-item-actions" pattern found — file unchanged.\n'
            "Check that schedule-planner.js still uses that class name."
        )
        return

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Done — patched {patched_count} occurrence(s) in {path.name}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # FIX: Accept an explicit path from the command line
        target = pathlib.Path(sys.argv[1])
    else:
        # FIX: Default to sibling WorkspaceJS folder next to this script
        target = (
            pathlib.Path(__file__).parent
            / "WorkspaceJS"
            / "schedule-planner.js"
        )

    patch_file(target)
