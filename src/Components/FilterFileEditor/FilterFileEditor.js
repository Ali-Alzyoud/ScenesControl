import React, {useState} from 'react'
import {FaSave, FaPlus, FaFastForward, FaFastBackward} from 'react-icons/fa'
import FilterRecord from './FilterRecord'
import { SceneGuideRecord, SceneGuideClass } from '../../common/SceneGuide'

import { connect } from "react-redux";
import { getTime, getRecords } from '../../redux/selectors';
import { addFilterItems, removeFilterIndex, updateFilterItem } from '../../redux/actions';

import './style.css'

function FilterFileEditor({records, time, addFilterItems, removeFilterIndex, updateFilterItem }) {
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [key, setKey] = useState(0);

    const addItem = () => {
        const newRecords = [new SceneGuideRecord()];
        addFilterItems(newRecords);
        setKey(key+1);
    }

    const removeItem = (index) => {
        removeFilterIndex(index);
        setKey(key+1);
    }

    const selectItem = (record, index) => {
        if (records[index] !== selectedRecord)
            setSelectedRecord(records[index]);
        else
            setSelectedRecord(null);
    }

    const selectime = (position) => {
        if (!selectedRecord) return;

        if (position === 'from'){
            selectedRecord.setFromTime(time);
        }
        else {
            selectedRecord.setToTime(time);
        }
        setKey(key+1);
    }

    const updateItem = (record, index) => {
        updateFilterItem(record, index);
        setKey(key+1);
    }

    const saveItems = () => {
        const element = document.createElement("a");
        const file = new Blob([SceneGuideClass.ToString(records)], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "myFile.txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    }

    return (
        <div className='editor-container'>
            <div className='container' onClick={addItem}>
                <FaPlus className='middle'/>
            </div>
            <div className='container' onClick={saveItems}>
                <FaSave className='middle'/>
            </div>
            <div className='container' onClick={() => selectime('from')}>
                <FaFastBackward className='middle' style={!selectedRecord ? {pointerEvents: "none", opacity: "0.4"}:{}}/>
            </div>
            <div className='container' onClick={() => selectime('to')}>
                <FaFastForward className='middle'  style={!selectedRecord ? {pointerEvents: "none", opacity: "0.4"}:{}}/>
            </div>
            <br/><br/>
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
                                index = {index}
                                record={record}
                                isSelected={selectedRecord === record}
                                removeItemIndex={removeItem}
                                updateItemIndex={updateItem}
                                selectItemIndex={selectItem}/>
                })
            }
            </table>
            </div>
        </div>
    )
}


const mapStateToProps = state => {
    const records = getRecords();
    const time = getTime();
    return { records, time };
  };

export default connect(mapStateToProps, {addFilterItems, removeFilterIndex, updateFilterItem})(FilterFileEditor);