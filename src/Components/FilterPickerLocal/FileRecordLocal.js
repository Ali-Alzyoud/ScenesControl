import React, { useMemo, useState, useRef } from 'react'
import StorageHelper from '../../Helpers/StorageHelper'
import { FaEye, FaFilter, FaPlayCircle, FaPencilAlt, FaDownload, FaTrash } from 'react-icons/fa'
import { MdVideoLibrary, MdFavorite, MdFavoriteBorder } from 'react-icons/md'


export default function FileRecord({ imgSrc, title, filter, isMultiEpisode, episodeCount, hasProgress: hasProgressProp, video, copy, focused, focusRef, isFavorite, onToggleFavorite, onRename, onDownload, onDelete, draggable, onDragStart, dropTarget, folderKey }) {
    const parts = title?.split("/");
    const localTitle = parts?.length > 1 ? parts[parts.length - 1] : title;
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);
    const hasProgress = useMemo(() => {
        if (hasProgressProp) return true;
        if (!video) return false;
        const fileName = video.split('/').reverse()[0];
        return StorageHelper.getContentProgress({ videoName: fileName }) > 0;
    }, [video, hasProgressProp]);

    const startEdit = e => {
        e.stopPropagation();
        setEditValue(localTitle);
        setEditing(true);
        setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
    };

    const commitRename = e => {
        e.stopPropagation();
        const name = editValue.trim();
        setEditing(false);
        if (name && name !== localTitle) onRename?.(name);
    };

    const onKeyDown = e => {
        e.stopPropagation();
        if (e.key === 'Enter') commitRename(e);
        if (e.key === 'Escape') setEditing(false);
    };

    return (
        <div ref={focusRef} className={`file-record2${focused ? ' file-record2--focused' : ''}${dropTarget ? ' file-record2--drop-target' : ''}`} onClick={editing ? undefined : copy} draggable={draggable} onDragStart={onDragStart} data-cardfolder={folderKey}>
            <div className="file-record2-image-wrap">
                {imgSrc
                    ? <img src={imgSrc} alt={localTitle} draggable={false} />
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
                {editing ? (
                    <input
                        ref={inputRef}
                        className="file-record2-rename-input"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={onKeyDown}
                        onBlur={commitRename}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <>
                        <span className="file-record2-title">{localTitle}</span>
                        {(onDownload || onRename || onDelete) && (
                            <div className="file-record2-actions">
                                {onDownload && (
                                    <button
                                        className="file-record2-action-btn"
                                        onClick={e => { e.stopPropagation(); onDownload(); }}
                                        title="Download into this folder"
                                    >
                                        <FaDownload />
                                    </button>
                                )}
                                {onRename && (
                                    <button
                                        className="file-record2-action-btn"
                                        onClick={startEdit}
                                        title="Rename"
                                    >
                                        <FaPencilAlt />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        className="file-record2-action-btn file-record2-delete-btn"
                                        onClick={e => { e.stopPropagation(); onDelete(); }}
                                        title="Delete folder"
                                    >
                                        <FaTrash />
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
