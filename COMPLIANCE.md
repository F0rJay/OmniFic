# Apache-2.0 and Third-Party License Compliance

OmniFic is an Apache-2.0 derivative of OpenFic v0.7.5. The unmodified Apache
license text is in `LICENSE`; required attribution is in `NOTICE`; dependency
and font terms are in `THIRD_PARTY_NOTICES` and `third_party/fonts/`.

## Modification notices

Files inherited from OpenFic and changed by OmniFic carry this statement in a
format appropriate to the file:

> Modified by OmniFic contributors from OpenFic v0.7.5.

For strict JSON files, the statement is stored in the top-level
`_omnificModificationNotice` field. For PNG files, it is stored in a PNG
`tEXt` chunk named `Modification Notice`. The release-please manifest is
excluded because every top-level key is interpreted as a releasable package
path; attribution remains available through the repository-level `NOTICE`
without introducing an invalid release component.

Apply or verify notices with:

```bash
python3 scripts/apply_modification_notices.py
python3 scripts/apply_modification_notices.py --check
```

## Third-party notices

Install the locked production dependencies before regenerating the notice
bundle:

```bash
pnpm --dir frontend install --frozen-lockfile
pnpm --dir desktop install --frozen-lockfile
cd backend && uv sync --frozen --no-dev && cd ..
python3 scripts/generate_third_party_notices.py
```

The generator reads the license and NOTICE files shipped by the installed npm
and Python distributions, verifies the Python inventory and exact versions
against the universal `uv.lock` graph, deduplicates identical texts, records
the complete production package inventories, and appends bundled-font
attribution. Platform-only Python license files are vendored under
`third_party/python-universal/` so regeneration is deterministic on Linux,
macOS, and Windows.

For third-party components with source-availability duties, including
MPL-2.0 components, `THIRD_PARTY_NOTICES` identifies the exact version and a
source/homepage or registry URL where the corresponding source can be
obtained.

## Release requirements

Every source and binary distribution must make these files readable:

- `LICENSE`
- `NOTICE`
- `THIRD_PARTY_NOTICES`
- `third_party/fonts/FONTS.md`
- `third_party/fonts/OFL-1.1.txt`

The frontend exposes them under `/legal/`. Desktop applications place them in
the application resources `legal/` directory. Python archives include them at
archive root, and Docker images place them in `/app/legal/`.

Desktop packages additionally place Electron's MIT license and Chromium's
generated third-party license bundle under `resources/legal/electron/`. These
files are taken from the exact installed Electron runtime and are verified
byte-for-byte after packaging.

Desktop setup pins `uv` and the python-build-standalone release. Their exact
versions and terms are recorded in `THIRD_PARTY_NOTICES`. The downloaded
Python archive retains its platform-specific Python, pip, and bundled
component licenses; setup refuses an extracted runtime whose main Python
license file is missing.

The Docker runtime base and copied `uv` binary are also version-pinned and
listed in `THIRD_PARTY_NOTICES`. The official Python/Debian base layers are
used without removing their installed license and package-copyright
materials.

Run the compliance gate with:

```bash
python3 scripts/check_license_compliance.py
```

This is an engineering compliance process and is not a substitute for legal
advice about ownership, patents, trademarks, or jurisdiction-specific duties.
