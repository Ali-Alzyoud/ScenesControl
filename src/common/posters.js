// The picture for a library title ({ folder, files }): its own image if the folder has a real one,
// else the server's poster (IMDb poster, or a frame from the video — see RemoteConnection's
// utils/posters.js). Torrent-site images (www.YTS.MX.jpg, WWW.YIFY-TORRENTS.COM.jpg …) are ads, not
// posters, and are ignored.
const AD_IMAGE = /(yts|yify|torrent|rarbg|eztv|ettv|1337x|www\.|\.com|\.org|\.to\b)/i;

export function titleImage(domain, item) {
    const token = encodeURIComponent(localStorage.getItem('rc_auth_token') || '');
    const own = (item?.files || []).find(f => f.type === 'IMAGE' && !AD_IMAGE.test(f.name.split('/').pop()));
    if (own) return `${domain}/static/${item.folder}/${own.name}?token=${token}`;
    return item?.folder ? `${domain}/poster?folder=${encodeURIComponent(item.folder)}&token=${token}` : '';
}
