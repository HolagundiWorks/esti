cmake_minimum_required(VERSION 3.16)
project(aorms_estimate_desktop VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()

if(NOT MSVC)
  add_compile_options(-Wall -Wextra)
endif()

find_package(Threads REQUIRED)

# ── Engine + SQLite store (pure C++; no server, no external SQLite dependency) ──
# SQLite is vendored as the amalgamation and compiled straight in, so the app is
# fully self-contained on every platform.
add_library(estimate_core STATIC
  src/estimate.cpp
  src/bbs_engine.cpp
  src/db.cpp
  src/capi.cpp
  third_party/sqlite3.c
)
target_include_directories(estimate_core PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/third_party
)
target_compile_definitions(estimate_core PRIVATE
  SQLITE_THREADSAFE=1
  SQLITE_OMIT_LOAD_EXTENSION
  SQLITE_DQS=0
)
target_link_libraries(estimate_core PUBLIC Threads::Threads ${CMAKE_DL_LIBS})
if(UNIX AND NOT APPLE)
  target_link_libraries(estimate_core PUBLIC m)
endif()
# Keep the vendored amalgamation out of -Wall/-Wextra noise.
set_source_files_properties(third_party/sqlite3.c PROPERTIES COMPILE_OPTIONS "-w")

# ── Tests (engine parity + C ABI); no GUI/webview needed ─────────────────────
enable_testing()
add_executable(test_engine tests/test_engine.cpp)
target_link_libraries(test_engine PRIVATE estimate_core)
add_test(NAME engine_parity COMMAND test_engine)

add_executable(test_capi tests/test_capi.cpp)
target_link_libraries(test_capi PRIVATE estimate_core)
add_test(NAME capi_roundtrip COMMAND test_capi)

# ── Native desktop app (OS webview host) ─────────────────────────────────────
# Guarded: on Linux it needs GTK3 + WebKitGTK dev packages. Where they are
# missing (e.g. headless CI for the engine tests) the app target is skipped but
# the library + tests still build.
option(ESTI_BUILD_DESKTOP "Build the webview desktop app" ON)
set(ESTI_DESKTOP_OK OFF)
if(ESTI_BUILD_DESKTOP)
  if(WIN32 OR APPLE)
    set(ESTI_DESKTOP_OK ON)
  else()
    find_package(PkgConfig QUIET)
    if(PkgConfig_FOUND)
      pkg_check_modules(GTK3 QUIET gtk+-3.0)
      pkg_check_modules(WEBKIT2 QUIET webkit2gtk-4.1)
      if(NOT WEBKIT2_FOUND)
        pkg_check_modules(WEBKIT2 QUIET webkit2gtk-4.0)
      endif()
      if(GTK3_FOUND AND WEBKIT2_FOUND)
        set(ESTI_DESKTOP_OK ON)
      endif()
    endif()
  endif()
endif()

if(ESTI_DESKTOP_OK)
  add_executable(aorms-estimate-desktop app/main.cpp)
  target_link_libraries(aorms-estimate-desktop PRIVATE estimate_core)
  if(WIN32)
    # WebView2 SDK — restored via NuGet in CI; WEBVIEW2_DIR is the package root
    # (…/Microsoft.Web.WebView2.<ver>). Static loader → no extra DLL to ship (the
    # Edge WebView2 runtime is present on Windows 10/11).
    if(NOT WEBVIEW2_DIR)
      message(FATAL_ERROR "WEBVIEW2_DIR not set (path to the Microsoft.Web.WebView2 NuGet package)")
    endif()
    target_include_directories(aorms-estimate-desktop PRIVATE "${WEBVIEW2_DIR}/build/native/include")
    target_link_libraries(aorms-estimate-desktop PRIVATE
      "${WEBVIEW2_DIR}/build/native/x64/WebView2LoaderStatic.lib"
      advapi32 ole32 shell32 shlwapi user32 version)
    if(MSVC)
      # GUI subsystem but keep the standard main() entry point (no console window).
      target_link_options(aorms-estimate-desktop PRIVATE /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup)
    endif()
  elseif(APPLE)
    target_link_libraries(aorms-estimate-desktop PRIVATE "-framework WebKit" "-framework Cocoa")
  else()
    target_include_directories(aorms-estimate-desktop PRIVATE ${GTK3_INCLUDE_DIRS} ${WEBKIT2_INCLUDE_DIRS})
    target_link_libraries(aorms-estimate-desktop PRIVATE ${GTK3_LIBRARIES} ${WEBKIT2_LIBRARIES})
    target_compile_options(aorms-estimate-desktop PRIVATE ${GTK3_CFLAGS_OTHER} ${WEBKIT2_CFLAGS_OTHER})
  endif()

  include(GNUInstallDirs)
  install(TARGETS aorms-estimate-desktop RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})
  # The SPA bundle (built separately) ships next to the executable.
  if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../dist/index.html")
    install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/../dist/index.html"
            DESTINATION ${CMAKE_INSTALL_BINDIR})
  endif()

  # ── Installer packaging (CPack): NSIS/ZIP on Windows, TGZ/DMG on *nix ──────
  set(CPACK_PACKAGE_NAME "AORMS Estimate")
  set(CPACK_PACKAGE_VENDOR "Holagundi Consulting Works")
  set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
  set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "AORMS Estimate — native offline estimating desktop app")
  set(CPACK_PACKAGE_INSTALL_DIRECTORY "AORMS Estimate")
  set(CPACK_STRIP_FILES ON)
  if(WIN32)
    set(CPACK_GENERATOR "NSIS;ZIP")
    # Stable installer filename → matches the landing download link + resolver.
    set(CPACK_PACKAGE_FILE_NAME "AORMS-Estimate-Setup")
    set(CPACK_NSIS_DISPLAY_NAME "AORMS Estimate")
    set(CPACK_NSIS_PACKAGE_NAME "AORMS Estimate")
    set(CPACK_PACKAGE_EXECUTABLES "aorms-estimate-desktop" "AORMS Estimate")
  elseif(APPLE)
    set(CPACK_GENERATOR "DragNDrop;TGZ")
  else()
    set(CPACK_GENERATOR "TGZ")
  endif()
  include(CPack)
else()
  message(STATUS "aorms-estimate-desktop: skipped (webview deps not found; engine lib + tests still build)")
endif()
