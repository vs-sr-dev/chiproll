@echo off
setlocal

rem ============================================================================
rem Build the ChipRoll 2600 validation cart with dasm.
rem
rem Expects dasm.exe at D:\dasm\dasm.exe (where Samuele installed dasm
rem 2.20.14.1). Override with `set DASM=...\dasm.exe` before calling this if
rem you have it elsewhere.
rem
rem Output: build\song.bin (4096 bytes), build\song.lst, build\song.sym.
rem ============================================================================

if "%DASM%"=="" set DASM=D:\dasm\dasm.exe

if not exist "%DASM%" (
    echo ERROR: dasm not found at %DASM%
    echo Set the DASM environment variable to the full path of dasm.exe.
    exit /b 1
)

if not exist build mkdir build

rem dasm -f3 = raw binary, no header. -I adds an include search path for vcs.h.
"%DASM%" src\player.asm ^
    -f3 ^
    -obuild\song.bin ^
    -lbuild\song.lst ^
    -sbuild\song.sym ^
    -I"src" ^
    -I"D:\dasm\machines\atari2600"

if errorlevel 1 (
    echo BUILD FAILED.
    exit /b 1
)

echo.
echo Built build\song.bin. Open it in Stella ^(or any 2600 emulator^) to test.
endlocal
