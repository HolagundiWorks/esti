cmake_minimum_required(VERSION 3.16)
project(aorms_estimate_backend VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()

if(NOT MSVC)
  add_compile_options(-Wall -Wextra)
endif()

# ── SQLite3 (system) ─────────────────────────────────────────────────────────
# CMake ships FindSQLite3 (>= 3.14). On Debian/Ubuntu: apt install libsqlite3-dev.
find_package(SQLite3 REQUIRED)

# ── Threads (cpp-httplib) ────────────────────────────────────────────────────
set(THREADS_PREFER_PTHREAD_FLAG ON)
find_package(Threads REQUIRED)

# ── Shared engine + persistence library ──────────────────────────────────────
add_library(estimate_core STATIC
  src/estimate.cpp
  src/bbs_engine.cpp
  src/db.cpp
)
target_include_directories(estimate_core PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/third_party
)
target_link_libraries(estimate_core PUBLIC SQLite::SQLite3)

# ── HTTP server executable ───────────────────────────────────────────────────
add_executable(aorms-estimate-backend src/main.cpp)
target_link_libraries(aorms-estimate-backend PRIVATE estimate_core Threads::Threads)

# ── Tests ────────────────────────────────────────────────────────────────────
enable_testing()
add_executable(test_engine tests/test_engine.cpp)
target_link_libraries(test_engine PRIVATE estimate_core)
add_test(NAME engine_parity COMMAND test_engine)

# ── Install rules ────────────────────────────────────────────────────────────
include(GNUInstallDirs)
install(TARGETS aorms-estimate-backend RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})
install(FILES README.md DESTINATION ${CMAKE_INSTALL_DATAROOTDIR}/doc/aorms-estimate-backend)
if(UNIX AND NOT APPLE)
  # systemd service + default env (Linux server deployments).
  install(FILES packaging/aorms-estimate-backend.service
          DESTINATION ${CMAKE_INSTALL_LIBDIR}/systemd/system)
  install(FILES packaging/default.env DESTINATION /etc/default
          RENAME aorms-estimate-backend)
endif()

# ── CPack: build installable packages (see README §Packaging) ────────────────
set(CPACK_PACKAGE_NAME "aorms-estimate-backend")
set(CPACK_PACKAGE_VENDOR "Holagundi Consulting Works")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "AORMS Estimate — standalone C++ + SQLite estimating backend")
set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
set(CPACK_PACKAGE_VERSION_MAJOR "${PROJECT_VERSION_MAJOR}")
set(CPACK_PACKAGE_VERSION_MINOR "${PROJECT_VERSION_MINOR}")
set(CPACK_PACKAGE_VERSION_PATCH "${PROJECT_VERSION_PATCH}")
set(CPACK_PACKAGE_CONTACT "Holagundi Consulting Works <dev@aorms.in>")
set(CPACK_PACKAGE_HOMEPAGE_URL "https://aorms.in")
set(CPACK_PACKAGE_INSTALL_DIRECTORY "AORMS Estimate Backend")
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../../LICENSE")
  set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/../../LICENSE")
endif()
set(CPACK_STRIP_FILES ON)

# Default generators per platform (override with `cpack -G <GEN>`).
if(WIN32)
  set(CPACK_GENERATOR "NSIS;ZIP")
elseif(APPLE)
  set(CPACK_GENERATOR "TGZ")
else()
  set(CPACK_GENERATOR "TGZ;DEB")
endif()

# Debian package — depends on the shared SQLite runtime the binary links.
set(CPACK_DEBIAN_PACKAGE_DEPENDS "libsqlite3-0")
set(CPACK_DEBIAN_PACKAGE_SECTION "utils")
set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")
set(CPACK_DEBIAN_FILE_NAME "DEB-DEFAULT")
set(CPACK_DEBIAN_PACKAGE_CONTROL_EXTRA
    "${CMAKE_CURRENT_SOURCE_DIR}/packaging/postinst;${CMAKE_CURRENT_SOURCE_DIR}/packaging/postrm")

# Windows NSIS installer metadata (built on Windows CI).
set(CPACK_NSIS_DISPLAY_NAME "AORMS Estimate Backend")
set(CPACK_NSIS_PACKAGE_NAME "AORMS Estimate Backend")
set(CPACK_NSIS_URL_INFO_ABOUT "${CPACK_PACKAGE_HOMEPAGE_URL}")

include(CPack)
