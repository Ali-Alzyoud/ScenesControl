
class Utils {
    static hasActiveInput = ()=>{
        var activeElement = document.activeElement;
        var inputs = ['input', 'select', 'button', 'textarea'];

        if (activeElement && inputs.indexOf(activeElement.tagName.toLowerCase()) !== -1) {
            return true;
        }
        return false;
    }

    // Strips a known domain-relative base (/static, /video, or bare domain) off a URL,
    // leaving a public-dir-relative path (e.g. "/Folder/movie.mp4"). Returns null if the
    // URL isn't served from this domain at all.
    static serverRelativePath = (url, domain) => {
        const bases = [domain + '/static', domain + '/video', domain];
        for (const b of bases) { if (url.startsWith(b)) return url.slice(b.length).split('?')[0]; }
        return null;
    }
};

export default Utils;

