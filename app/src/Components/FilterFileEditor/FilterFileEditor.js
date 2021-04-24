import React, {useState} from 'react'
import {FaSave, FaPlus, FaFastForward, FaFastBackward} from 'react-icons/fa'
import FilterRecord from './FilterRecord'
import { SceneGuideRecord } from '../../common/SceneGuide'
import './style.css'

export default function FilterFileEditor({ sceneObject, getCurrentTime }) {
    const [records, setRecords] = useState(sceneObject.Records);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(false);

    const addItem = () => {
        setRecords([new SceneGuideRecord(),...records]);
    }

    const removeItem = (recordItem) => {
        setRecords(records.filter((record => record!==recordItem)));
    }

    const selectItem = (recordItem) => {
        if (recordItem !== selectedRecord)
            setSelectedRecord(recordItem);
        else
            setSelectedRecord(null);
    }

    const selectime = (position) => {
        if (!selectedRecord || !getCurrentTime) return;
        let time = getCurrentTime();
        if (position === 'from'){
            selectedRecord.setFromTime(time);
            console.log(selectedRecord.From)
        }
        else {
            selectedRecord.setToTime(time);
        }
        setForceUpdate(!forceUpdate);
    }

    const saveItems = () => {
        const element = document.createElement("a");
        const file = new Blob([sceneObject.toString()], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "myFile.txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    }

    return (
        <div>
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
            <table>
            <tr>
                <th>From</th>
                <th>To</th>
                <th>Type</th>
                <th>Intensity</th>
            </tr>
            {
                records.map((record, index) => {
                    console.log(index)
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
    )
}
