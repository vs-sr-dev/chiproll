@echo off
setlocal

rem ============================================================================
rem Build the ChipRoll 2600 validation cart with dasm.
rem
rem Requires the DASM environment variable pointing to the full path of
rem dasm.exe (e.g. `set DASM=C:\tools\dasm\dasm.exe`). The dasm distribution
rem ships with machines\atari2600\vcs.h next to the binary; we derive that
rem include directory automatically from %DASM%.
rem
rem Output: build\song.bin (4096 bytes), build\song.lst, build\song.sym.
rem ============================================================================

if "%DASM%"=="" (
    echo ERROR: DASM environment variable not set.
    echo Set it to the full path of dasm.exe, e.g.:
    echo   set DASM=C:\tools\dasm\dasm.exe
    exit /b 1
)

if not exist "%DASM%" (
    echo ERROR: dasm not found at %DASM%
    exit /b 1
)

if not exist build mkdir build

rem Derive the dasm install directory from %DASM% so we can find machines\.
for %%i in ("%DASM%") do set DASM_DIR=%%~dpi

"%DASM%" src\player.asm ^
    -f3 ^
    -obuild\song.bin ^
    -lbuild\song.lst ^
    -sbuild\song.sym ^
    -I"src" ^
    -I"%DASM_DIR%machines\atari2600"

if errorlevel 1 (
    echo BUILD FAILED.
    exit /b 1
)

echo.
echo Built build\song.bin. Open it in Stella ^(or any 2600 emulator^) to test.
endlocal
