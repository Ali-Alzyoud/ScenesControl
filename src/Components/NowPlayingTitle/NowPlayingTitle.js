import React from 'react';
import { useSelector } from 'react-redux';
import { selectVideoSrc } from '../../redux/selectors';
import { libraryPath } from '../../common/episodes';
import { openImdb } from '../../common/imdb';
import './style.css';

// The playing video's name, with shortcuts to its IMDb page and Parents Guide (library videos).
export default function NowPlayingTitle({ videoName }) {
    const videoSrc = useSelector(selectVideoSrc);
    const rel = libraryPath(videoSrc);
    const folder = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    const file = rel.split('/').pop();
    return (
        <p className="now-playing-title">
            <span className="now-playing-name">{videoName}</span>
            {folder && (
                <>
                    <button className="now-playing-imdb" onClick={() => openImdb(folder, file)} title="Open this title on IMDb">IMDb</button>
                    <button className="now-playing-link" onClick={() => openImdb(folder, file, { page: 'parents' })} title="IMDb Parents Guide — sex & nudity">Parents Guide</button>
                </>
            )}
        </p>
    );
}
