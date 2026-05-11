@echo off
setlocal

rem ============================================================================
rem Build the ChipRoll NES validation cart with cc65 (NROM mapper 0).
rem
rem Expects cc65 at D:\ca65 (where Samuele installed it). cl65 -t nes wraps
rem ca65 + ld65 with the bundled nes.cfg, producing a 24 KiB .nes file
rem (16 header + 16 PRG + 8 CHR). Override with `set CC65_HOME=...` if your
rem install is elsewhere.
rem ============================================================================

if "%CC65_HOME%"=="" set CC65_HOME=D:\ca65

if not exist "%CC65_HOME%\bin\cl65.exe" (
    echo ERROR: cl65 not found at %CC65_HOME%\bin\cl65.exe
    echo Set the CC65_HOME environment variable to the cc65 install root.
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
