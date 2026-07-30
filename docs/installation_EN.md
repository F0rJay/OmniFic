# OmniFic installation, updates, and removal

> Last updated: 2026-07-31 · Applies to OmniFic 0.8.2

OmniFic is available as a Windows/macOS desktop application, a PyPI package, a Docker image, and source code. Official Linux desktop packages are not published; Linux users can run the PyPI package, Docker image, or source tree.

After installation and first launch, continue with the [user guide](./user-guide_EN.md) to configure models, create a project, and set up writing and Agent workflows.

## Choose a distribution

| Distribution | Best for | Included |
|---|---|---|
| Windows/macOS desktop package | Direct installation and launch | Electron client, matching backend wheel, and portable-runtime setup flow |
| `pip install omnific` | Browser use with a managed Python environment | Python backend, CLI, and compiled web frontend; no Electron client |
| Docker | Servers, NAS devices, and containers | Linux amd64/arm64 backend and web frontend image |
| Source | Development, debugging, and contributions | Complete frontend, backend, and desktop source |

## Windows desktop

Download the matching package from [GitHub Releases](https://github.com/F0rJay/OmniFic/releases/latest):

| Device | Recommended file |
|---|---|
| Most Intel/AMD Windows PCs | `OmniFic-<version>-win-x86_64-setup.exe` |
| Windows on ARM | `OmniFic-<version>-win-arm64-setup.exe` |

Use `setup.exe` for a normal installation. The ZIP is a portable archive and does not register a Windows uninstall entry.

The installed Windows application supports in-app updates. First-time setup prepares a local Python and OmniFic backend runtime; keep your proxy available when required and follow the visible installation progress.

## macOS desktop

| Device | Recommended file |
|---|---|
| Apple Silicon (M1 and later) | `OmniFic-<version>-mac-arm64.dmg` |
| Intel Mac | `OmniFic-<version>-mac-x86_64.dmg` |

DMG is the recommended manual installer. ZIP is the matching archive and future update carrier. Do not use the `x86_64` package on Apple Silicon unless you intentionally need Rosetta compatibility.

OmniFic 0.8.2 is ad-hoc signed but not Developer ID signed or Apple-notarized. macOS may show an unidentified-developer or security warning. For the first launch:

1. Open the DMG and drag `OmniFic.app` into Applications.
2. In Finder, Control-click OmniFic in Applications.
3. Choose **Open**, then confirm **Open** again.

In-app updates remain disabled on macOS 0.8.2. Download new versions manually until Developer ID signing and notarization are enabled.

## Install from PyPI

Python 3.12 or 3.13 is required:

```bash
python -m pip install --upgrade omnific
omnific version
omnific serve
```

Open `http://127.0.0.1:8000`. The PyPI package includes the web application but not `.exe`, `.app`, the desktop title bar, setup UI, or in-app updater. Its default data directory is `~/.omnific`; override it with `OMNIFIC_DATA_DIR` when needed.

## Run with Docker

```bash
docker pull ghcr.io/f0rjay/omnific:latest
docker run -d \
  --name omnific \
  -p 8000:8000 \
  -v omnific-data:/data \
  ghcr.io/f0rjay/omnific:latest
```

Open `http://127.0.0.1:8000`. The image is published for Linux amd64/arm64; this is a server distribution and not a Linux desktop application.

## Run from source

```bash
git clone https://github.com/F0rJay/OmniFic.git
cd OmniFic

# Terminal 1: backend
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .

# Terminal 2: frontend
cd frontend
pnpm install
pnpm dev
```

Open `http://127.0.0.1:9000`. See the [development setup guide](./develop/setup.md) for additional commands.

## Back up your data

Before an upgrade, migration, or complete removal, back up the data directory. Desktop data includes manuscripts, checkpoints, covers, character images, configuration, and logs. Record any custom runtime directory selected during desktop setup as well.

Do not overwrite the current OmniFic data directory with an OpenFic or OmniFic 0.8.0 directory. The naming migration does not guarantee compatibility with legacy configuration or paths.

## Remove the Windows desktop application

### Remove the application only

1. Quit OmniFic completely.
2. Open **Settings → Apps → Installed apps**.
3. Find OmniFic and select **Uninstall**.

You can also run `Uninstall OmniFic.exe` from the installation directory. The system uninstaller preserves user data by default.

### Remove the application and all data

Before removing the system installation, inspect the `installDir` values in `%APPDATA%\omnific-desktop\config.json` and record any custom runtime location. After uninstalling, enter `%APPDATA%` in File Explorer and move the `omnific-desktop` folder to the Recycle Bin, then verify and remove the OmniFic `runtime` folder from any custom location.

For the ZIP distribution, delete the extracted application directory, then remove user data as described above.

## Remove the macOS desktop application

### Remove the application only

1. Quit OmniFic and confirm that neither OmniFic nor its local Python backend is running in Activity Monitor.
2. Move `/Applications/OmniFic.app` to the Trash.

This preserves manuscripts, configuration, and the local runtime for a later reinstall.

### Remove the application and all data

Back up anything you want to keep. Before deleting configuration, inspect the `installDir` values in `~/Library/Application Support/omnific-desktop/config.json` and record any custom runtime location. In Finder, press `Command + Shift + G`, check each path, and move it to the Trash if it exists:

- `~/Library/Application Support/omnific-desktop`
- `~/Library/Preferences/com.omnific.app.plist`
- `~/Library/Caches/com.omnific.app`
- `~/Library/Saved Application State/com.omnific.app.savedState`

If desktop setup used a custom runtime location, verify it and remove its OmniFic `runtime` folder. Empty the Trash only after confirming your backup and that OmniFic no longer launches.

## Remove the PyPI package

```bash
python -m pip uninstall omnific
```

This does not delete `~/.omnific`. Remove that directory separately only after confirming that its manuscripts and configuration are no longer needed.

## Remove the Docker deployment

```bash
docker stop omnific
docker rm omnific
```

These commands preserve the `omnific-data` volume. To permanently delete it after confirming a backup:

```bash
docker volume rm omnific-data
```

Deleting user data or a Docker volume is irreversible once it leaves the Trash or backup system.
