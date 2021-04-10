import React from 'react'
import FilterRecord from './FilterRecord'
import './style.css'

export default function FilterFileEditor({ sceneObject }) {
    return (
        <div>
            {
                sceneObject.Records.map((record, index) => {
                    return <FilterRecord key={index} record={record} />
                })
            }
        </div>
    )
}
