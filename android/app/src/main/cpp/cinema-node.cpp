#include <jni.h>
#include <string>
#include <cstdlib>
#include <cstring>
#include <pthread.h>
#include <unistd.h>
#include <android/log.h>
#include "node.h"

#define ADBTAG "NODEJS-MOBILE"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, ADBTAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, ADBTAG, __VA_ARGS__)

static bool nodeStarted = false;

// Start threads to redirect stdout and stderr to logcat.
static int pipe_stdout[2];
static int pipe_stderr[2];
static pthread_t thread_stdout;
static pthread_t thread_stderr;

void *thread_stderr_func(void*) {
    ssize_t redirect_size;
    char buf[2048];
    while((redirect_size = read(pipe_stderr[0], buf, sizeof buf - 1)) > 0) {
        if(buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_ERROR, ADBTAG, buf);
    }
    return 0;
}

void *thread_stdout_func(void*) {
    ssize_t redirect_size;
    char buf[2048];
    while((redirect_size = read(pipe_stdout[0], buf, sizeof buf - 1)) > 0) {
        if(buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_INFO, ADBTAG, buf);
    }
    return 0;
}

int start_redirecting_stdout_stderr() {
    setvbuf(stdout, 0, _IONBF, 0);
    pipe(pipe_stdout);
    dup2(pipe_stdout[1], STDOUT_FILENO);

    setvbuf(stderr, 0, _IONBF, 0);
    pipe(pipe_stderr);    
    dup2(pipe_stderr[1], STDERR_FILENO);

    if(pthread_create(&thread_stdout, 0, thread_stdout_func, 0) == -1)
        return -1;
    pthread_detach(thread_stdout);

    if(pthread_create(&thread_stderr, 0, thread_stderr_func, 0) == -1)
        return -1;
    pthread_detach(thread_stderr);

    return 0;
}

extern "C" {

JNIEXPORT void JNICALL
Java_com_cinema_runner_NodeJSService_startNodeWithArguments(
        JNIEnv* env,
        jobject thiz,
        jobjectArray arguments) {
    if (nodeStarted) {
        LOGI("Node already started");
        return;
    }
    nodeStarted = true;

    // Redirect stdout/stderr to logcat
    start_redirecting_stdout_stderr();

    // Node's libUV requires all arguments being on contiguous memory.
    jsize argument_count = env->GetArrayLength(arguments);
    int c_arguments_size = 0;
    for (int i = 0; i < argument_count ; i++) {
        auto str = (jstring) env->GetObjectArrayElement(arguments, i);
        const char* rawStr = env->GetStringUTFChars(str, nullptr);
        c_arguments_size += strlen(rawStr) + 1;
        env->ReleaseStringUTFChars(str, rawStr);
    }

    char* args_buffer = (char*) calloc(c_arguments_size, sizeof(char));
    char** argv = (char**) malloc(argument_count * sizeof(char*));
    char* current_args_position = args_buffer;

    for (int i = 0; i < argument_count ; i++) {
        auto str = (jstring) env->GetObjectArrayElement(arguments, i);
        const char* current_argument = env->GetStringUTFChars(str, nullptr);
        strncpy(current_args_position, current_argument, strlen(current_argument));
        argv[i] = current_args_position;
        current_args_position += strlen(current_argument) + 1;
        env->ReleaseStringUTFChars(str, current_argument);
    }

    LOGI("Starting node with %d args: %s, %s", argument_count, argv[0], argv[1]);

    // node::Start blocks until Node exits
    int exitCode = node::Start(argument_count, argv);
    LOGI("Node exited with code %d", exitCode);

    free(argv);
    free(args_buffer);
    nodeStarted = false;
}

JNIEXPORT jstring JNICALL
Java_com_cinema_runner_NodeJSService_getCurrentABI(
        JNIEnv* env,
        jobject /* thiz */) {
#if defined(__aarch64__)
    return env->NewStringUTF("arm64-v8a");
#elif defined(__arm__)
    return env->NewStringUTF("armeabi-v7a");
#elif defined(__x86_64__)
    return env->NewStringUTF("x86_64");
#else
    return env->NewStringUTF("x86");
#endif
}

} // extern "C"
