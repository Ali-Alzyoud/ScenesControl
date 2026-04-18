import React, { useMemo } from 'react'
import StorageHelper from '../../Helpers/StorageHelper'
import { FaEye, FaFilter, FaPlayCircle } from 'react-icons/fa'
import { MdVideoLibrary, MdFavorite, MdFavoriteBorder } from 'react-icons/md'


export default function FileRecord({ imgSrc, title, filter, isMultiEpisode, episodeCount, hasProgress: hasProgressProp, video, copy, focused, focusRef, isFavorite, onToggleFavorite }) {
    const localTitle = title?.includes("/") ? title?.split("/")?.[1] : title;
    const hasProgress = useMemo(() => {
        if (hasProgressProp) return true;
        if (!video) return false;
        const fileName = video.split('/').reverse()[0];
        return StorageHelper.getContentProgress({ videoName: fileName }) > 0;
    }, [video, hasProgressProp]);

    return (
        <div ref={focusRef} className={`file-record2${focused ? ' file-record2--focused' : ''}`} onClick={copy}>
            <div className="file-record2-image-wrap">
                {imgSrc
                    ? <img src={imgSrc} alt={localTitle} />
                    : <div className="file-record2-no-image"><FaPlayCircle /></div>
                }
                <button
                    className={`file-record2-star${isFavorite ? ' file-record2-star--active' : ''}`}
                    onClick={e => { e.stopPropagation(); onToggleFavorite?.(); }}
                    title={isFavorite ? 'Unpin' : 'Pin'}
                >
                    {isFavorite ? <MdFavorite /> : <MdFavoriteBorder />}
                </button>
                <div className="file-record2-badges">
                    {filter && (
                        <span className="badge badge-filter" title="Scene filter available">
                            <FaFilter />
                        </span>
                    )}
                    {hasProgress && (
                        <span className="badge badge-progress" title="In progress">
                            <FaEye />
                        </span>
                    )}
                    {isMultiEpisode && (
                        <span className="badge badge-episodes" title="Multiple episodes">
                            <MdVideoLibrary />
                            {episodeCount > 0 && <span className="badge-count">{episodeCount}</span>}
                        </span>
                    )}
                </div>
            </div>
            <div className="file-record2-footer">
                <span className="file-record2-title">{localTitle}</span>
            </div>
        </div>
    )
}
