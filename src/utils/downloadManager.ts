// Download Manager for Desktop and Mobile (Web uses native browser downloads)

export interface DownloadTask {
  id: string;
  title: string;
  filename: string;
  url: string;
  totalBytes: number;
  receivedBytes: number;
  percent: number;
  speed: string;
  status: "downloading" | "completed" | "error" | "paused";
  error?: string;
  filePath?: string;
  startedAt: number;
}

type DownloadListener = (tasks: DownloadTask[]) => void;

class DownloadManagerService {
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Set<DownloadListener> = new Set();

  constructor() {
    // Listen for desktop Electron IPC download events
    if (typeof window !== "undefined" && (window as any).CinemaDesktop?.onDownloadProgress) {
      (window as any).CinemaDesktop.onDownloadProgress((data: Partial<DownloadTask> & { id: string }) => {
        const existing = this.tasks.get(data.id);
        if (existing) {
          Object.assign(existing, data);
          this.notify();
        }
      });
    }
  }

  public subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    listener(Array.from(this.tasks.values()));
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
    this.listeners.forEach((cb) => cb(list));
  }

  public getTasks(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  public getActiveCount(): number {
    return Array.from(this.tasks.values()).filter((t) => t.status === "downloading").length;
  }

  public async startDownload(url: string, title: string, customFilename?: string): Promise<string> {
    const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanTitle = (title || "video").replace(/[^a-zA-Z0-9 ._-]/g, "_");
    const filename = customFilename || `${cleanTitle}.mp4`;

    // 1. Desktop Mode (Electron): Track progress with native Node.js stream in Download Manager
    if (typeof window !== "undefined" && (window as any).CinemaDesktop?.startDownload) {
      const task: DownloadTask = {
        id,
        title: title || filename,
        filename,
        url,
        totalBytes: 0,
        receivedBytes: 0,
        percent: 0,
        speed: "Starting...",
        status: "downloading",
        startedAt: Date.now(),
      };
      this.tasks.set(id, task);
      this.notify();

      try {
        await (window as any).CinemaDesktop.startDownload({ id, url, title, filename });
      } catch (err: any) {
        task.status = "error";
        task.error = err?.message || "Desktop download failed";
        this.notify();
      }
      return id;
    }

    // 2. Web Browser Mode: Direct native browser download (handled by browser's download shelf)
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return id;
  }

  public cancelDownload(id: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    if (typeof window !== "undefined" && (window as any).CinemaDesktop?.cancelDownload) {
      (window as any).CinemaDesktop.cancelDownload(id);
    }

    task.status = "paused";
    task.speed = "Cancelled";
    this.notify();
  }

  public openFile(id: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    if (typeof window !== "undefined" && (window as any).CinemaDesktop?.openDownloadFile) {
      (window as any).CinemaDesktop.openDownloadFile(task.filePath || task.filename);
    }
  }

  public clearCompleted() {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === "completed" || task.status === "error" || task.status === "paused") {
        this.tasks.delete(id);
      }
    }
    this.notify();
  }
}

export const downloadManager = new DownloadManagerService();
