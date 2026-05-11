@echo off
setlocal

rem ============================================================================
rem Build the ChipRoll 7800 / POKEY validation cart.
rem
rem Pipeline:
rem   1) dasm src\player.asm  ->  build\song.bin  (16 KiB raw linear cart)
rem   2) 7800header -f script  ->  build\song.a78 (A78 header + POKEY@450 flag)
rem
rem Requires:
rem   - DASM env var pointing to dasm.exe (shared with the 2600 build)
rem   - A78ASM_HOME env var pointing to the 7800 toolchain root containing
rem     bin\7800header.exe and includes\7800.h (compiled / unpacked from
rem     7800-devtools/7800basic — see this folder's README for setup)
rem
rem Output:  build\song.bin, build\song.a78, build\song.lst, build\song.sym
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

if "%A78ASM_HOME%"=="" (
    echo ERROR: A78ASM_HOME environment variable not set.
    echo Set it to the 7800 toolchain install root, e.g.:
    echo   set A78ASM_HOME=C:\tools\7800
    exit /b 1
)
if not exist "%A78ASM_HOME%\bin\7800header.exe" (
    echo ERROR: 7800header.exe not found at %A78ASM_HOME%\bin\7800header.exe
    exit /b 1
)
if not exist "%A78ASM_HOME%\includes\7800.h" (
    echo ERROR: 7800.h not found at %A78ASM_HOME%\includes\7800.h
    exit /b 1
)

if not exist build mkdir build

rem --- Step 1: assemble with dasm ---------------------------------------------
"%DASM%" src\player.asm ^
    -f3 ^
    -obuild\song.bin ^
    -lbuild\song.lst ^
    -sbuild\song.sym ^
    -I"src" ^
    -I"%A78ASM_HOME%\includes"

if errorlevel 1 (
    echo BUILD FAILED at dasm step.
    exit /b 1
)

rem --- Step 2: wrap with A78 header + POKEY@$450 flag -------------------------
rem 7800header reads a small command script from stdin. We feed it via -f.
> build\headerinit.txt echo name ChipRoll POKEY
>>build\headerinit.txt echo set linear
>>build\headerinit.txt echo set pokey@450
>>build\headerinit.txt echo set tvntsc
>>build\headerinit.txt echo fix
>>build\headerinit.txt echo save build\song.a78
>>build\headerinit.txt echo exit

rem 7800header expects FILENAME = the raw .bin to wrap.
"%A78ASM_HOME%\bin\7800header.exe" -f build\headerinit.txt build\song.bin

if errorlevel 1 (
    echo BUILD FAILED at 7800header step.
    exit /b 1
)

echo.
echo Built build\song.a78. Open it in A7800 ^(or MAME a7800 / RetroArch ProSystem^).
endlocal
