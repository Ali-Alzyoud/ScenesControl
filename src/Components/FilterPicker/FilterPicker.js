import React from 'react'
import { MdClose, MdSearch } from 'react-icons/md'
import FileRecord from './FileRecord'

import "./style.css"

export default function FilterPicker({ list, close }) {
    const listTempItem = <FileRecord imgSrc={"https://m.media-amazon.com/images/M/MV5BZjRiMmQ2MzUtMDA2My00OGQxLWJiYjItNDU3YTA4NDIyMGEyXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_UY100_CR25,0,100,100_AL_.jpg"} title="Coming Soon"/>
    const items = [listTempItem,listTempItem,listTempItem,listTempItem,listTempItem,listTempItem];
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
                        {items}
                    </list>
                </div>
            </div>
        </div>
    )
}
