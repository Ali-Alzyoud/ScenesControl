import React, {useState} from 'react'
import {FaSave, FaPlus} from 'react-icons/fa'
import FilterRecord from './FilterRecord'
import { SceneGuideClass, SceneGuideRecord, SceneIntensity, SceneType } from '../../common/SceneGuide'
import './style.css'

export default function FilterFileEditor({ sceneObject }) {
    const [records, setRecords] = useState(sceneObject.Records)

    const addItem = () => {
        setRecords([new SceneGuideRecord(),...records]);
    }

    const removeItem = (recordItem) => {
        setRecords(records.filter((record => record!==recordItem)));
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
                    return <FilterRecord key={record.id} record={record} removeItem={removeItem}/>
                })
            }
            </table>
        </div>
    )
}
