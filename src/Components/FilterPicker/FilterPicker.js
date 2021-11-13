import React from 'react'
import { MdClose, MdSearch } from 'react-icons/md'
import FileRecord from './FileRecord'

import "./style.css"

export default function FilterPicker({ list, close }) {
    return (
        <div className="filters-container">
            <div className="filters-container-body">
                <MdClose className="filters-container-close" onClick={close} />
                <div className='filters-container-input-container'>
                    <input className='filters-container-input'></input>
                   
                </div>
                <MdSearch  className="filters-container-search" />
                <div className="filter-files">
                    <list>
                        <FileRecord src={""} title="Coming Soon"/>
                    </list>
                </div>
            </div>
        </div>
    )
}
