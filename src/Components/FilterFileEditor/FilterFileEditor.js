import React, {useState} from 'react'
import {FaSave, FaPlus, FaFastForward, FaFastBackward} from 'react-icons/fa'
import FilterRecord from './FilterRecord'
import { SceneGuideRecord } from '../../common/SceneGuide'

import { connect } from "react-redux";
import { getTime, getRecords } from '../../redux/selectors';

import './style.css'

function FilterFileEditor({records, time }) {
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(false);

    const addItem = () => {
        // const newRecords = [new SceneGuideRecord(),...records];
        // setRecords(newRecords);
    }

    const removeItem = (recordItem) => {
        // const newRecords = records.filter((record => record!==recordItem));
        // setRecords(newRecords);
    }

    const selectItem = (recordItem) => {
        if (recordItem !== selectedRecord)
            setSelectedRecord(recordItem);
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
        setForceUpdate(!forceUpdate);
    }

    const saveItems = () => {
        // const element = document.createElement("a");
        // const file = new Blob([sceneObject.toString()], {type: 'text/plain'});
        // element.href = URL.createObjectURL(file);
        // element.download = "myFile.txt";
        // document.body.appendChild(element); // Required for this to work in FireFox
        // element.click();
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
                <FaFastBackward className='middle'/>
            </div>
            <div className='container' onClick={() => selectime('to')}>
                <FaFastForward className='middle'/>
            </div>
            <br/><br/>
            <div className='table-container'>
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
                                key={record.id}
                                record={record}
                                isSelected={selectedRecord === record}
                                removeItem={removeItem}
                                selectItem={selectItem}/>
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

export default connect(mapStateToProps)(FilterFileEditor);