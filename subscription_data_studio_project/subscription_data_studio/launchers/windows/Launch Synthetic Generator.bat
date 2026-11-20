@echo off
setlocal
set "GENERATOR_HTML=%~dp0subscription_data_studio.html"
if not exist "%GENERATOR_HTML%" (
  echo The generator HTML file is missing from this folder.
  pause
  exit /b 1
)
start "" "%GENERATOR_HTML%"
