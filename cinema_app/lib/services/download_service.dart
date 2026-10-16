import 'dart:io';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

class DownloadTask {
  final String id;
  final String title;
  final String url;
  double progress = 0.0;
  String downloadedSize = '0 MB';
  String totalSize = 'Unknown';
  String status = 'Downloading';
  String savePath = '';
  CancelToken cancelToken = CancelToken();

  DownloadTask({
    required this.id,
    required this.title,
    required this.url,
  });
}

class DownloadService extends ChangeNotifier {
  static final DownloadService _instance = DownloadService._internal();
  factory DownloadService() => _instance;
  DownloadService._internal();

  final Dio _dio = Dio();
  final List<DownloadTask> tasks = [];

  Future<String?> selectDownloadFolder() async {
    try {
      if (Platform.isAndroid) {
        await Permission.storage.request();
        await Permission.manageExternalStorage.request();
      }

      String? selectedDirectory = await FilePicker.getDirectoryPath();
      if (selectedDirectory != null) {
        return selectedDirectory;
      }
    } catch (e) {
      debugPrint('Error selecting download folder: $e');
    }

    // Fallback: standard Downloads directory
    final downloadsDir = await getExternalStorageDirectory();
    return downloadsDir?.path;
  }

  Future<void> startDownload({
    required String title,
    required String url,
    required BuildContext context,
  }) async {
    final folder = await selectDownloadFolder();
    if (folder == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Download cancelled: No folder selected')),
        );
      }
      return;
    }

    final sanitizedTitle = title.replaceAll(RegExp(r'[^\w\s\.-]'), '_').trim();
    final extension = url.contains('.mp4') ? 'mp4' : (url.contains('.mkv') ? 'mkv' : 'mp4');
    final filePath = '$folder/$sanitizedTitle.$extension';

    final task = DownloadTask(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      url: url,
    );
    task.savePath = filePath;
    tasks.add(task);
    notifyListeners();

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Downloading to: $folder'),
          duration: const Duration(seconds: 3),
        ),
      );
    }

    try {
      await _dio.download(
        url,
        filePath,
        cancelToken: task.cancelToken,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            task.progress = received / total;
            task.downloadedSize = '${(received / (1024 * 1024)).toStringAsFixed(1)} MB';
            task.totalSize = '${(total / (1024 * 1024)).toStringAsFixed(1)} MB';
          } else {
            task.downloadedSize = '${(received / (1024 * 1024)).toStringAsFixed(1)} MB';
          }
          notifyListeners();
        },
      );
      task.status = 'Completed';
      notifyListeners();
    } catch (e) {
      if (CancelToken.isCancel(e as DioException)) {
        task.status = 'Cancelled';
      } else {
        task.status = 'Failed';
      }
      notifyListeners();
    }
  }

  void cancelTask(DownloadTask task) {
    task.cancelToken.cancel();
    task.status = 'Cancelled';
    notifyListeners();
  }
}
