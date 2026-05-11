@echo off
setlocal

rem ============================================================================
rem Build the ChipRoll NES validation cart with cc65 (NROM mapper 0).
rem
rem Requires the CC65_HOME environment variable pointing to the root of a
rem cc65 install (the directory containing `bin\cl65.exe`, e.g.
rem `set CC65_HOME=C:\tools\cc65`). `cl65 -t nes` wraps ca65 + ld65 with
rem the bundled NROM config and produces a 40 KiB .nes file (16 B iNES
rem header + 32 KiB PRG + 8 KiB CHR).
rem ============================================================================

if "%CC65_HOME%"=="" (
    echo ERROR: CC65_HOME environment variable not set.
    echo Set it to the cc65 install root, e.g.:
    echo   set CC65_HOME=C:\tools\cc65
    exit /b 1
)

if not exist "%CC65_HOME%\bin\cl65.exe" (
    echo ERROR: cl65 not found at %CC65_HOME%\bin\cl65.exe
    exit /b 1
)

if not exist build mkdir build

"%CC65_HOME%\bin\cl65.exe" ^
    -t nes ^
    -I src ^
    -o build\song.nes ^
    --mapfile build\song.map ^
    -l build\song.lst ^
    -Ln build\song.sym ^
    src\player.asm

if errorlevel 1 (
    echo BUILD FAILED.
    exit /b 1
)

echo.
echo Built build\song.nes. Open it in Mesen ^(or any NES emulator^) to test.
endlocal
