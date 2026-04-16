class StorageHelper {
    static saveToCurrentList({
        videos,
        srts,
        filters,
        index
    }: { videos: any[]; srts: any[]; filters: any[]; index: number }) {
        localStorage.currentListIndex = index;
        localStorage.currentList = JSON.stringify({ videos, srts, filters });
    }

    static saveContentProgress({ videoName, time }: { videoName: string; time: string | number }) {
        localStorage.setItem(videoName, `${time}`);
    }

    static getContentProgress({ videoName }: { videoName: string }) {
        return Number(localStorage.getItem(videoName) || 0);
    }

    // ── Watch History ──────────────────────────────────────────

    static addToWatchHistory({
        videoPath,
        srtPath,
        filterPath,
        imagePath,
    }: {
        videoPath: string;
        srtPath?: string;
        filterPath?: string;
        imagePath?: string;
    }) {
        if (!videoPath) return;
        const videoName = videoPath.split('/').reverse()[0];
        const history = this.getWatchHistory();
        const existingIdx = history.findIndex((h: any) => h.videoName === videoName);
        const existing = existingIdx >= 0 ? history[existingIdx] : null;
        if (existingIdx >= 0) history.splice(existingIdx, 1);
        history.unshift({
            videoName,
            videoPath,
            srtPath: srtPath ?? existing?.srtPath ?? '',
            filterPath: filterPath ?? existing?.filterPath ?? '',
            imagePath: imagePath ?? existing?.imagePath ?? '',
            timestamp: Date.now(),
        });
        localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 100)));
    }

    static getWatchHistory(): any[] {
        try {
            return JSON.parse(localStorage.getItem('watchHistory') || '[]');
        } catch {
            return [];
        }
    }
}

export default StorageHelper;
