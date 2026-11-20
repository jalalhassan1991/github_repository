# Desktop launchers

The generator is a self-contained HTML page. These launchers open it in the user's default browser; the Mac app and Windows launcher keep a copy of the page beside the launcher so they can be moved as a folder.

## macOS

Run `mac/build_mac_app.sh` on macOS to build `Synthetic Subscription Generator.app` for that Mac's architecture (Apple Silicon or Intel). Copy the `.app` to Applications or share it as a zip. The app opens the bundled HTML in the default browser. It is ad hoc signed locally, not Developer ID signed or notarized, so macOS may require the recipient to approve opening it under Privacy & Security.

For a source update, run `python3 synthetic_generator/build.py` from the repository root. It embeds `synthetic_data_generator.js` into the standalone HTML, refreshes the Windows HTML copy, builds the Mac app, and verifies that the packaged HTML matches. Use `python3 synthetic_generator/build.py --sync-only` to update the HTML copies without building an app. On Windows, run `python synthetic_generator/build.py` to sync the files and build the Windows executable.

## Windows

Put `windows/Launch Synthetic Generator.bat` and `synthetic_data_generator.html` in the same folder and double-click the batch launcher. This is a runnable launcher without installation.

To create a standalone `SyntheticSubscriptionGenerator.exe`, put `Build Windows EXE.ps1` and `synthetic_data_generator.html` in the same folder on Windows, then run the PowerShell build script. The generated executable looks for the HTML page beside itself and opens it in the default browser. PowerShell execution policy may require running the script from an approved local folder.

All launchers require a modern browser. Chrome or Edge is needed for the generator's large streamed CSV exports.

## Saving a Data Studio instance

In any launcher, use **Save Studio** to download a `subscription_data_studio_instance.json` file. It contains the Data Dictionary, report sheets and modules, filters, templates, and generator settings. If a dataset had been generated, the file also stores its seed and generation inputs; **Load Studio** restores the workspace and regenerates the same synthetic dataset. The generated rows are reproducible from that metadata, so the instance file remains compact.
