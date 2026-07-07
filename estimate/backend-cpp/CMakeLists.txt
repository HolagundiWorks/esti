cmake_minimum_required(VERSION 3.16)
project(aorms_estimate_backend LANGUAGES CXX)

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
