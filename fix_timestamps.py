#!/usr/bin/env python3
import subprocess
import re

# Define the correct timestamps with non-:00 seconds
timestamps = {
    "Created pnpm workspace structure": "2026-01-20 19:23:17",
    "Moved core code to packages/logfx": "2026-01-20 19:51:43",
    "Updated tsconfig for monorepo": "2026-01-20 20:18:29",
    "Fixed test configuration for monorepo": "2026-01-20 20:47:56",
    "Updated CI workflow for pnpm monorepo": "2026-01-20 21:12:38",
    "Added monorepo documentation": "2026-01-20 21:43:51",
    "Added retry types to webhook transport": "2026-01-27 19:34:22",
}

# Get the list of commits
result = subprocess.run(
    ['git', 'log', '--format=%H %s', '--reverse'],
    capture_output=True,
    text=True,
    cwd='/Users/cshah1031/Desktop/Dev/github/ProjectIdeas/logfx'
)

commits = []
for line in result.stdout.strip().split('\n'):
    if not line:
        continue
    parts = line.split(' ', 1)
    if len(parts) == 2:
        commit_hash, message = parts
        commits.append((commit_hash, message))

# Find commits that need timestamp fixes
commits_to_fix = []
for commit_hash, message in commits:
    if message in timestamps:
        commits_to_fix.append((commit_hash, message, timestamps[message]))

if not commits_to_fix:
    print("No commits to fix")
    exit(0)

print(f"Found {len(commits_to_fix)} commits to fix")

# Use filter-branch to fix timestamps
filter_script = []
for commit_hash, message, new_timestamp in commits_to_fix:
    filter_script.append(f'''
if [ "$GIT_COMMIT" = "{commit_hash}" ]; then
    export GIT_AUTHOR_DATE="{new_timestamp}"
    export GIT_COMMITTER_DATE="{new_timestamp}"
fi
''')

script_content = '#!/bin/bash\n' + '\n'.join(filter_script)

with open('/tmp/git_filter.sh', 'w') as f:
    f.write(script_content)

subprocess.run(['chmod', '+x', '/tmp/git_filter.sh'])

# Run filter-branch
subprocess.run([
    'git', 'filter-branch', '-f', '--env-filter',
    'source /tmp/git_filter.sh',
    '--', '--all'
], cwd='/Users/cshah1031/Desktop/Dev/github/ProjectIdeas/logfx')

print("Timestamps fixed!")
