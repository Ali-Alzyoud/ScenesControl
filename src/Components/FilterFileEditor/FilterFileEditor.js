import React, { useState, useEffect } from 'react'
import { FaSave, FaPlus, FaFastForward, FaFastBackward } from 'react-icons/fa'
import FilterRecord from './FilterRecord'
import { SceneGuideRecord, SceneGuideClass } from '../../common/SceneGuide'

import { connect } from "react-redux";
import { selectTime, selectRecords, selectVideoName, selectModalOpen } from '../../redux/selectors';
import { addFilterItems, removeFilterIndex, removeAllFilters, updateFilterItem } from '../../redux/actions';
import {FaMinus} from 'react-icons/fa'

import './style.css'

function FilterFileEditor({ records, time, videoName, addFilterItems, removeFilterIndex, removeAllFilters, updateFilterItem, modalOpen }) {
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [key, setKey] = useState(0);

    useEffect(() => {
        const KEY = {
            N: 78,
            S: 83,
            OPEN_BRACKET: 219,
            CLOSE_BRACKET: 221,

        };
        const handleKeyDown = (e) => {
            if(modalOpen) return;
            switch (e.keyCode) {
                case KEY.N:
                    {
                        addItem();
                    }
                    break;
                case KEY.S:
                    {
                        if (e.ctrlKey)
                        {
                            saveItems();
                        }
                        else
                        {
                            selectItem(records[0]);
                        }
                    }
                    break;
                case KEY.OPEN_BRACKET:
                    {
                        selectime("from");
                    }
                    break;
                case KEY.CLOSE_BRACKET:
                    {
                        selectime("to");
                    }
                    break;
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [records, key, selectedRecord, time]);

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
            return;
        }

        if (records[index] === selectedRecord) {
            setSelectedRecord(null);
        }
        else {
            setSelectedRecord(record);
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

    const updateItem = (record, index) => {
        if (!record || index === -1) return;
        updateFilterItem(record, index);
        setKey(key + 1);
    }

    const saveItems = () => {
        const element = document.createElement("a");
        const file = new Blob([SceneGuideClass.ToString(records)], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = videoName+".txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    }

    return (
        <div className='editor-container'>
            <div className='container' onClick={addItem}>
                <FaPlus className='middle' />
            </div>
            <div className='container' onClick={saveItems}>
                <FaSave className='middle' />
            </div>
            <div className='container' onClick={() => selectime('from')}>
                <FaFastBackward className='middle' style={!selectedRecord ? { pointerEvents: "none", opacity: "0.4" } : {}} />
            </div>
            <div className='container' onClick={() => selectime('to')}>
                <FaFastForward className='middle' style={!selectedRecord ? { pointerEvents: "none", opacity: "0.4" } : {}} />
            </div>
            <div className='container red' onClick={() => removeAll('to')}>
                <FaMinus className='middle' />
            </div>
            <br /><br />
            <div className='table-container' key={key}>
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
                </table>
            </div>
        </div>
    )
}


const mapStateToProps = state => {
    const records = selectRecords(state);
    const videoName = selectVideoName(state);
    const time = selectTime(state);
    const modalOpen = selectModalOpen(state);
    return { records, time, videoName, modalOpen };
};

export default connect(mapStateToProps, { addFilterItems, removeFilterIndex, removeAllFilters, updateFilterItem })(FilterFileEditor);