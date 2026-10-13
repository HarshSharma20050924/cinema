cmake_minimum_required(VERSION 3.4.1)

project("cinema-node")

# Resolve node.h headers dynamically to avoid hardcoded absolute path
if(NOT DEFINED NODEJS_INCLUDE_DIR)
    set(NODEJS_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../node_modules/nodejs-mobile-react-native/android/libnode/include/node")
endif()

add_library(
    cinema-node-lib
    SHARED
    src/main/cpp/cinema-node.cpp
)

include_directories(${NODEJS_INCLUDE_DIR})

# Import libnode.so from jniLibs (already copied there)
add_library(libnode SHARED IMPORTED)
set_target_properties(
    libnode
    PROPERTIES IMPORTED_LOCATION
    ${CMAKE_CURRENT_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI}/libnode.so
)

find_library(log-lib log)

target_link_libraries(
    cinema-node-lib
    libnode
    ${log-lib}
)
