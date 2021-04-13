import React, {useState} from 'react'
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

    return (
        <div>
            <button onClick={addItem}>+</button>
            {
                records.map((record, index) => {
                    console.log(index)
                    return <FilterRecord key={record.id} record={record} removeItem={removeItem}/>
                })
            }
        </div>
    )
}
