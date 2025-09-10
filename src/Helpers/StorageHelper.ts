class StorageHelper {
    static saveToCurrentList({
        videos,
        srts,
        filters,
        index
    }: { videos: any[]; srts: any[]; filters: any[]; index: number }) {
        localStorage.currentListIndex = index
        localStorage.currentList = JSON.stringify({
            videos,
            srts,
            filters,
        });
    }
    static saveContentProgress({videoName, time}: { videoName: string; time: string | number }) {
        localStorage.setItem(videoName, `${time}`);
    }
    static getContentProgress({videoName}: { videoName: string }) {
        const getCurrentTime = Number(localStorage.getItem(videoName) || 0);
        return getCurrentTime;
    }
}

export default StorageHelper;