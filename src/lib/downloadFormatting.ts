export const formatDownloadBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

export const formatDownloadSpeed = (bytesPerSecond: number): string =>
  `${formatDownloadBytes(bytesPerSecond)}/s`;

export const formatDownloadProgressLabel = (item: {
  sourceType?: string | null;
  videoType?: string | null;
  downloadedBytes: number;
  totalBytes: number;
}): string => {
  const isHls = item.sourceType === 'hls' || item.videoType === 'm3u8';
  if (item.totalBytes > 0) {
    const percent = Math.min(
      100,
      Math.max(0, Math.round((item.downloadedBytes / item.totalBytes) * 100)),
    );
    if (isHls) {
      return `${percent}%`;
    }
    const downloadedMB = Math.round(item.downloadedBytes / 1024 / 1024);
    const totalMB = Math.round(item.totalBytes / 1024 / 1024);
    if (downloadedMB === 0 && totalMB === 0) {
      return `${percent}%`;
    }
    return `${downloadedMB} / ${totalMB} MB`;
  }
  return 'Downloading';
};

