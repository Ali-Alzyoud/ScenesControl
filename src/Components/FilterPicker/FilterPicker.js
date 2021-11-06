import React from 'react'
import { MdClose } from 'react-icons/md'

import "./style.css"

export default function FilterPicker({ list, close }) {
    return (
        <div className="filters-container">
            <div className="filters-container-body">
            <MdClose className="filters-container-close" onClick={close}/>
            To be added later
            </div>
        </div>
    )
}
