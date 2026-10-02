import React, { useState, useEffect, useRef } from 'react'
import { FaSave, FaPlus, FaFastForward, FaFastBackward, FaToggleOn, FaToggleOff, FaCloudUploadAlt, FaEye, FaEyeSlash } from 'react-icons/fa'
import FilterRecord from './FilterRecord'
import SceneTimeline from './SceneTimeline'
import { SceneGuideRecord, SceneGuideClass, SceneType } from '../../common/SceneGuide'

import { connect, useDispatch, useSelector } from "react-redux";
import { selectTime, selectRecords, selectVideoName, selectModalOpen, selectFilterPath, selectVideoSrc, selectPlayerConfig, selectSelectedFilterdItems } from '../../redux/selectors';
import { addFilterItems, removeFilterIndex, removeAllFilters, updateFilterItem, setFilterItems, setDrawingEnabled, setToastText, setSelectedFilterItems, setPlayerConfig, setTime } from '../../redux/actions';
import { authFetch, getUser } from '../../common/auth';
import {FaMinus} from 'react-icons/fa'

import './style.css'
import Utils from '../../utils/utils';

const KEY = {
    N: 78,
    S: 83,
    R: 82,
    OPEN_BRACKET: 219,
    CLOSE_BRACKET: 221,
    ONE: 49,
    TWO: 50,
    THREE: 51,
    FOUR: 52,
    ARROW_UP: 38,
    ARROW_DOWN: 40,
};

function FilterFileEditor(props) {
    const {
        records,
        time,
        videoName,
        videoSrc,
        filterPath,
        addFilterItems,
        removeFilterIndex,
        removeAllFilters,
        updateFilterItem,
        setFilterItems,
        modalOpen,
        setDrawingEnabled,
        setToastText,
        setSelectedFilterItems
    } = props;
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [key, setKey] = useState(0);
    const [keyEvent, setKeyEvent] = useState(null);
    const selectNext = useRef(null);
    const [toggleRow, setToggleRow] = useState(false);
    const [rawText, setRawText] = useState('');

    useEffect(()=>{
        if(selectNext.current){
            selectime("from");
            selectNext.current = false;
        }
    },[selectedRecord]);

    useEffect(()=>{
        if(selectNext.current){
            selectItem(props.records[0]);
        }
    },[records && records.length]);

    useEffect(()=>{
        return ()=>{
            setSelectedFilterItems(null);
        }
    }, []);

    useEffect(() => {
        if(Utils.hasActiveInput()) return;
        if(modalOpen || !keyEvent) return;
        switch (keyEvent.keyCode) {
            case KEY.N:
                {
                    addItem();
                }
                break;
            case KEY.S:
                {
                    if (keyEvent.ctrlKey)
                    {
                        saveItems();
                    }
                    else
                    {
                        selectItem(records[0]);
                    }
                }
                break;
            case KEY.R:
                {
                    setDrawingEnabled(true);
                }
                break;
            case KEY.ONE:
                {
                    selectType(SceneType.Violence);
                }
                break;
            case KEY.TWO:
                {
                    selectType(SceneType.Nudity);
                }
                break;
            case KEY.THREE:
                {
                    selectType(SceneType.Sex);
                }
                break;
            case KEY.FOUR:
                {
                    selectType(SceneType.Profanity);
                }
                break;
            case KEY.ARROW_UP:
                {
                    if (selectedRecord?.Type) {
                        if (selectedRecord.Type == SceneType.Profanity)
                            selectType(SceneType.Sex);
                        else if (selectedRecord.Type == SceneType.Sex)
                            selectType(SceneType.Nudity);
                        else if (selectedRecord.Type == SceneType.Nudity)
                            selectType(SceneType.Violence);
                    }
                }
                break;
            case KEY.ARROW_DOWN:
                {
                    if (selectedRecord?.Type) {
                        if (selectedRecord.Type == SceneType.Violence)
                            selectType(SceneType.Nudity);
                        else if (selectedRecord.Type == SceneType.Nudity)
                            selectType(SceneType.Sex);
                        else if (selectedRecord.Type == SceneType.Sex)
                            selectType(SceneType.Profanity);
                    }
                }
                break;
            case KEY.OPEN_BRACKET:
                {
                    if(selectedRecord){
                        selectime("from");
                    } else {
                        addItem();
                        selectNext.current = true;
                    }
                }
                break;
            case KEY.CLOSE_BRACKET:
                {
                    if(selectedRecord){
                        selectime("to");
                        setSelectedRecord(null);
                        selectItem(null)
                    } else {
                        setSelectedRecord(props.records[0]);
                        selectime("to");
                        setSelectedRecord(null);
                        selectItem(null)
                    }
                }
                break;
        }
    }, [keyEvent]);

    useEffect(() => {
        const KEY = {
            N: 78,
            S: 83,
            OPEN_BRACKET: 219,
            CLOSE_BRACKET: 221,

        };
        const handleKeyDown = (e) => {
            setKeyEvent(e);
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

    const addItem = () => {
        const newRecords = [new SceneGuideRecord()];
        addFilterItems(newRecords);
        setKey(key + 1);
        return newRecords;
    }

    const removeAll = () => {
        removeAllFilters();
    }

    // A row's remove button: same as deleting it with the Delete key (the next one gets selected).
    const removeItem = (record) => {
        if (records.indexOf(record) === -1) return;
        actions.current.deleteSelected(record);
    }

    const selectItem = (record) => {
        const index = records.indexOf(record);
        if (index === -1) {
            setSelectedRecord(null);
            setSelectedFilterItems(null);
            return;
        }

        if (records[index] === selectedRecord) {
            setSelectedRecord(null);
            setSelectedFilterItems(null);
        }
        else {
            setSelectedRecord(record);
            setSelectedFilterItems([record]);
        }
    }

    const selectime = (position) => {
        if (!selectedRecord) return;

        const index = records.indexOf(selectedRecord);
        if (index === -1) return;

        if (position === 'from') {
            selectedRecord.setFromTime(time);
        }
        else {
            selectedRecord.setToTime(time);
        }
        updateItem(selectedRecord, index);
    }

    const selectType = (type) => {
        if (!selectedRecord) return;

        const index = records.indexOf(selectedRecord);
        if (index === -1) return;

        setToastText(type);
        selectedRecord.Type = type;
        updateItem(selectedRecord, index);
    }

    const updateItem = (record, index) => {
        if (!record || index === -1) return;
        updateFilterItem(record, index);
        setKey(key + 1);
    }

    // Re-parses the raw-text editor's current content back into structured records and pushes
    // it into the store, so switching back to the table (or saving) reflects whatever was typed
    // there. Only relevant while the raw view is showing — otherwise the structured records are
    // already the source of truth.
    const applyRawTextIfEditing = () => {
        if (!toggleRow) return records;
        const parsed = SceneGuideClass.FromString(rawText);
        setFilterItems(parsed);
        // Re-serialize so the textarea reflects the canonical form of what was just saved,
        // instead of drifting from whatever formatting the user happened to type.
        setRawText(SceneGuideClass.ToString(parsed));
        return parsed;
    }

    const saveItems = () => {
        const currentRecords = applyRawTextIfEditing();
        const element = document.createElement("a");
        const file = new Blob([SceneGuideClass.ToString(currentRecords)], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = videoName + ".txt";
        document.body.appendChild(element);
        element.click();
    }

    const saveRemote = async () => {
        const domain = localStorage.getItem('domain');
        if (!domain) { setToastText('No domain set'); return; }
        let resolvedPath = filterPath ? filterPath.split('?')[0] : filterPath;
        if (!resolvedPath && videoSrc) {
            // Derive from video src: strip domain+/static or domain+/video prefix, append .txt
            const staticBase = domain + '/static';
            const videoBase = domain + '/video';
            let relPath = videoSrc.startsWith(staticBase) ? videoSrc.slice(staticBase.length)
                : videoSrc.startsWith(videoBase) ? videoSrc.slice(videoBase.length)
                : videoSrc.startsWith(domain) ? videoSrc.slice(domain.length)
                : videoSrc;
            // videoSrc carries a ?token=... query string for playback auth — strip it before
            // appending the extension, or it ends up embedded in the saved server path.
            resolvedPath = relPath.split('?')[0] + '.txt';
        }
        if (!resolvedPath) {
            const input = window.prompt('Enter server path to save filter:', `/${videoName}.txt`);
            if (!input) return;
            resolvedPath = input.startsWith('/') ? input : '/' + input;
        }

        const content = SceneGuideClass.ToString(applyRawTextIfEditing());
        const staticBase = domain + '/static';
        const filePath = resolvedPath.startsWith(staticBase)
            ? resolvedPath.slice(staticBase.length)
            : resolvedPath.startsWith(domain)
                ? resolvedPath.slice(domain.length)
                : resolvedPath;
        try {
            const res = await authFetch(`${domain}/api/v1/files/save`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath, content }),
            });
            if (res.ok) {
                setToastText('Saved to server');
            } else {
                setToastText('Save failed');
            }
        } catch {
            setToastText('Save failed');
        }
    }

    // While editing you usually want to see the scenes: this switches the filter off (the same
    // setting as Settings / the remote's "Ignore filters").
    const dispatch = useDispatch();
    const ignoreFilters = !!useSelector(selectPlayerConfig)?.ignoreFilters;

    // Keyboard: Delete / Backspace removes the selected record (and selects the next one), Ctrl+Z
    // brings back the last one removed. Not while typing in a field.
    const lastDeleted = useRef(null);
    const keyState = useRef({});
    keyState.current = { records, selectedRecord };
    // Removes the selected record (the Delete key, or the timeline's delete button) and selects
    // the next one; restoreDeleted() brings it back (Ctrl+Z).
    // The next record is selected and shown (like clicking it), so you can keep reviewing.
    const showRecord = (record) => {
        setSelectedRecord(record);
        setSelectedFilterItems(record ? [record] : null);
        if (record) {
            dispatch(setPlayerConfig({ ignoreFilters: true }));
            dispatch(setTime(record._from));
        }
    };
    const deleteSelected = (target) => {
        const { records: list, selectedRecord: sel } = keyState.current;
        const victim = target || sel;
        const index = victim ? list.indexOf(victim) : -1;
        if (index === -1) return false;
        lastDeleted.current = { record: victim, index };
        const next = list[index + 1] || list[index - 1] || null;
        setFilterItems(list.filter(r => r !== victim));
        showRecord(next);
        setKey(k => k + 1);
        setToastText('Scene removed — Ctrl+Z to undo');
        return true;
    };
    const restoreDeleted = () => {
        if (!lastDeleted.current) return false;
        const { records: list } = keyState.current;
        const { record, index } = lastDeleted.current;
        lastDeleted.current = null;
        const restored = [...list];
        restored.splice(Math.min(index, restored.length), 0, record);
        setFilterItems(restored);
        showRecord(record);
        setKey(k => k + 1);
        setToastText('Scene restored');
        return true;
    };
    const actions = useRef({});
    actions.current = { deleteSelected, restoreDeleted };
    useEffect(() => {
        const onKey = (e) => {
            const el = document.activeElement;
            if (el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable)) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (actions.current.deleteSelected()) { e.preventDefault(); e.stopPropagation(); }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (actions.current.restoreDeleted()) e.preventDefault();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A record selected somewhere else (a bubble on the seekbar): select it here too.
    const externallySelected = useSelector(selectSelectedFilterdItems)?.[0] || null;
    useEffect(() => {
        if (externallySelected && externallySelected !== selectedRecord && records.includes(externallySelected)) setSelectedRecord(externallySelected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externallySelected]);

    // The scene before/after the selected one, in time order (the list itself isn't sorted).
    const neighbour = (dir) => {
        if (!selectedRecord) return null;
        const sorted = [...records].sort((a, b) => a._from - b._from || a._to - b._to);
        return sorted[sorted.indexOf(selectedRecord) + dir] || null;
    };

    // The scene timeline changed the selected record's start/end.
    const commitTimes = (from, to) => {
        const record = selectedRecord;
        if (!record) return;
        record.setFromTime(from, records);
        record.setToTime(to, records);
        updateItem(record, records.indexOf(record));
        setSelectedFilterItems([record]);
    };

    return (
        <div className='editor-container'>
            {selectedRecord && !toggleRow && (
                <SceneTimeline record={selectedRecord} onCommit={commitTimes} onDelete={() => deleteSelected()}
                    onPrev={neighbour(-1) ? () => showRecord(neighbour(-1)) : null}
                    onNext={neighbour(1) ? () => showRecord(neighbour(1)) : null} />
            )}
            <div className={`container${ignoreFilters ? ' red' : ''}`} onClick={() => dispatch(setPlayerConfig({ ignoreFilters: !ignoreFilters }))}
                title={ignoreFilters ? 'Filters are off — everything plays unfiltered (click to turn them back on)' : 'Ignore the filter while editing (show the scenes)'}>
                {ignoreFilters ? <FaEye className='middle' /> : <FaEyeSlash className='middle' />}
            </div>
            <div className='container' onClick={addItem}>
                <FaPlus className='middle' />
            </div>
            <div className='container' onClick={saveItems}>
                <FaSave className='middle' />
            </div>
            {getUser()?.role === 'admin' && (
                <div className='container' onClick={saveRemote}>
                    <FaCloudUploadAlt className='middle' />
                </div>
            )}
            <div className='container' onClick={() => selectime('from')}>
                <FaFastBackward className='middle' style={!selectedRecord ? { pointerEvents: "none", opacity: "0.4" } : {}} />
            </div>
            <div className='container' onClick={() => selectime('to')}>
                <FaFastForward className='middle' style={!selectedRecord ? { pointerEvents: "none", opacity: "0.4" } : {}} />
            </div>
            <div className='container red' onClick={() => removeAll('to')}>
                <FaMinus className='middle' />
            </div>
            <div className='container' onClick={() => {
                if (!toggleRow) {
                    // Entering the raw view — seed the textarea from the current structured records.
                    setRawText(SceneGuideClass.ToString(records));
                } else {
                    // Leaving it — parse whatever was typed back into structured records so the
                    // table (and any edits made there afterward) reflect the raw-text changes.
                    // Those are new record objects, so the old selection would point at a stale one.
                    setFilterItems(SceneGuideClass.FromString(rawText));
                    setSelectedRecord(null);
                    setSelectedFilterItems(null);
                }
                setToggleRow(!toggleRow);
            }}>
                {toggleRow ? <FaToggleOn className='middle' /> : <FaToggleOff className='middle' />}
            </div>
            <br /><br />
            <div className='table-container' key={key}>
                {toggleRow ?
                <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    spellCheck={false}
                    style={{ width: '400px', height: '400px' }}
                /> :
                <table>
                    <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Type</th>
                        <th>Intensity</th>
                    </tr>
                    {
                        records.map((record, index) => {
                            return <FilterRecord
                                index={index}
                                record={record}
                                isSelected={selectedRecord === record}
                                removeItem={removeItem}
                                updateItem={updateItem}
                                selectItem={selectItem} />
                        })
                    }
                </table>}
            </div>
        </div>
    )
}


const mapStateToProps = state => {
    const records = selectRecords(state);
    const videoName = selectVideoName(state);
    const videoSrc = selectVideoSrc(state);
    const filterPath = selectFilterPath(state);
    const time = selectTime(state);
    const modalOpen = selectModalOpen(state);
    return { records, time, videoName, videoSrc, filterPath, modalOpen };
};

export default connect(mapStateToProps, 
    { 
        addFilterItems,
        removeFilterIndex,
        removeAllFilters,
        updateFilterItem,
        setFilterItems,
        setDrawingEnabled,
        setToastText,
        setSelectedFilterItems
    })(FilterFileEditor);