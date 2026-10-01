import React, { useState, useEffect, useRef } from 'react'
import { FaSave, FaPlus, FaFastForward, FaFastBackward, FaToggleOn, FaToggleOff, FaCloudUploadAlt, FaEye, FaEyeSlash } from 'react-icons/fa'
import FilterRecord from './FilterRecord'
import { SceneGuideRecord, SceneGuideClass, SceneType } from '../../common/SceneGuide'

import { connect, useDispatch, useSelector } from "react-redux";
import { selectTime, selectRecords, selectVideoName, selectModalOpen, selectFilterPath, selectVideoSrc, selectPlayerConfig } from '../../redux/selectors';
import { addFilterItems, removeFilterIndex, removeAllFilters, updateFilterItem, setFilterItems, setDrawingEnabled, setToastText, setSelectedFilterItems, setPlayerConfig } from '../../redux/actions';
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

    const removeItem = (record) => {
        const index = records.indexOf(record);
        if (index === -1) return;

        removeFilterIndex(index);
        setKey(key + 1);
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

    return (
        <div className='editor-container'>
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