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

    static saveContentProgress({ videoName, time, duration }: { videoName: string; time: string | number; duration?: number }) {
        localStorage.setItem(videoName, `${time}`);
        if (duration && duration > 0) {
            localStorage.setItem(`${videoName}_dur`, `${duration}`);
        }
        try {
            const prog = this.getAllWatchProgress();
            prog[videoName] = { time: Number(time), duration: duration || prog[videoName]?.duration || 0, updatedAt: Date.now() };
            localStorage.setItem('watchProgress', JSON.stringify(prog));
        } catch {}
        window.dispatchEvent(new Event('sc:data-changed'));
    }

    static getAllWatchProgress(): Record<string, { time: number; duration: number; updatedAt: number }> {
        try { return JSON.parse(localStorage.getItem('watchProgress') || '{}'); } catch { return {}; }
    }

    static getContentProgress({ videoName }: { videoName: string }) {
        return Number(localStorage.getItem(videoName) || 0);
    }

    static getContentDuration({ videoName }: { videoName: string }) {
        return Number(localStorage.getItem(`${videoName}_dur`) || 0);
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
        localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 200)));
        window.dispatchEvent(new Event('sc:data-changed'));
    }

    static getWatchHistory(): any[] {
        try {
            return JSON.parse(localStorage.getItem('watchHistory') || '[]');
        } catch {
            return [];
        }
    }

    static async clearRemoteHistory(domain: string, token: string) {
        await fetch(`${domain}/api/v1/userdata/history`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    static clearWatchHistory() {
        localStorage.removeItem('watchHistory');
        localStorage.removeItem('watchProgress');
        const VIDEO_EXTS = ['.mkv', '.mp4', '.webm', '.avi', '.mov', '.m4v', '.ts', '.flv'];
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)!;
            const lower = key.toLowerCase();
            if (VIDEO_EXTS.some(ext => lower.endsWith(ext)) || VIDEO_EXTS.some(ext => lower.endsWith(ext + '_dur'))) {
                toRemove.push(key);
            }
        }
        toRemove.forEach(k => localStorage.removeItem(k));
    }

    // ── Favourites ────────────────────────────────────────────

    static getFavourites(): any[] {
        try { return JSON.parse(localStorage.getItem('favourites') || '[]'); } catch { return []; }
    }

    static getFavsModified(): number {
        return Number(localStorage.getItem('favsModified') || 0);
    }

    static isFavourite(videoName: string): boolean {
        return this.getFavourites().some((f: any) => f.videoName === videoName);
    }

    static toggleFavourite({ videoName, videoPath, srtPath, filterPath, imagePath }: {
        videoName: string; videoPath?: string; srtPath?: string; filterPath?: string; imagePath?: string;
    }): boolean {
        const favs = this.getFavourites();
        const idx = favs.findIndex((f: any) => f.videoName === videoName);
        const now = Date.now();
        if (idx >= 0) {
            favs.splice(idx, 1);
        } else {
            favs.unshift({ videoName, videoPath: videoPath || '', srtPath: srtPath || '', filterPath: filterPath || '', imagePath: imagePath || '', addedAt: now });
        }
        localStorage.setItem('favourites', JSON.stringify(favs));
        localStorage.setItem('favsModified', String(now));
        window.dispatchEvent(new Event('sc:favourites-changed'));
        // Push directly — don't rely on App.js event listener
        const domain = localStorage.getItem('domain');
        const token = localStorage.getItem('rc_auth_token');
        if (domain && token) {
            this.pushToServer(domain, token).catch(e => console.error('[fav] push err', e));
        }
        return idx < 0;
    }

    // ── Folder Favorites ─────────────────────────────────────

    static getFolderFavorites(): string[] {
        try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return []; }
    }

    static setFolderFavorites(folders: string[]) {
        localStorage.setItem('favorites', JSON.stringify(folders));
        const domain = localStorage.getItem('domain');
        const token = localStorage.getItem('rc_auth_token');
        if (domain && token) {
            this.pushToServer(domain, token).catch(e => console.error('[sync] folder fav push err', e));
        }
    }

    // ── Server Sync ───────────────────────────────────────────

    static async pushToServer(domain: string, token: string) {
        const body = {
            favourites: this.getFavourites(),
            favsModified: this.getFavsModified(),
            watchHistory: this.getWatchHistory(),
            watchProgress: this.getAllWatchProgress(),
            folderFavorites: this.getFolderFavorites(),
        };
        await fetch(`${domain}/api/v1/userdata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body),
        });
    }

    static async pullFromServer(domain: string, token: string) {
        const res = await fetch(`${domain}/api/v1/userdata`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        // Merge favourites
        if (Array.isArray(data.favourites)) {
            const local = this.getFavourites();
            const map: Record<string, any> = {};
            for (const f of local) map[f.videoName] = f;
            for (const f of data.favourites) {
                if (!map[f.videoName] || (f.addedAt || 0) > (map[f.videoName].addedAt || 0)) map[f.videoName] = f;
            }
            localStorage.setItem('favourites', JSON.stringify(Object.values(map)));
        }

        // Merge watch history
        if (Array.isArray(data.watchHistory)) {
            const local = this.getWatchHistory();
            const map: Record<string, any> = {};
            for (const h of local) map[h.videoName] = h;
            for (const h of data.watchHistory) {
                if (!map[h.videoName] || (h.timestamp || 0) > (map[h.videoName].timestamp || 0)) map[h.videoName] = h;
            }
            const merged = Object.values(map).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
            localStorage.setItem('watchHistory', JSON.stringify(merged.slice(0, 200)));
        }

        // Merge watch progress
        if (data.watchProgress && typeof data.watchProgress === 'object') {
            const local = this.getAllWatchProgress();
            for (const [key, val] of Object.entries(data.watchProgress) as any[]) {
                if (!local[key] || (val.updatedAt || 0) > (local[key].updatedAt || 0)) {
                    local[key] = val;
                    localStorage.setItem(key, `${val.time}`);
                    if (val.duration > 0) localStorage.setItem(`${key}_dur`, `${val.duration}`);
                }
            }
            localStorage.setItem('watchProgress', JSON.stringify(local));
        }

        // Restore folder favorites (server wins if present)
        if (Array.isArray(data.folderFavorites)) {
            const local = this.getFolderFavorites();
            const merged = Array.from(new Set([...local, ...data.folderFavorites]));
            localStorage.setItem('favorites', JSON.stringify(merged));
        }
    }
}

export default StorageHelper;
