import React, { useEffect, useState } from 'react'
import { MdClose, MdSearch } from 'react-icons/md'
import FileRecord from './FileRecord'
import * as API from '../../common/API/API'

import { connect } from "react-redux";
import { setFilterItems, setSubtitle } from '../../redux/actions'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'

import "./style.css"

function FilterPicker({ close, setFilterItems, setSubtitle }) {
    const [recordsItems, setRecordsItems] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState();
    const select = (index) => {
        setSelectedIndex(index);
        const selectedRecord = recordsItems[index];


            SrtClass.ReadFile(API.endpoint + "/" + selectedRecord.subtitle).then((records)=>{
                setSubtitle(records);
            });
            SceneGuideClass.ReadFile(API.endpoint + "/" + selectedRecord.filterSrc).then((records)=>{
                setFilterItems(records);
            });


    }
    useEffect(() => {
        API.getMediaRecords().then((value) => {
            const fileRecords = [];
            setRecordsItems(value.records);
        });
        return () => {
        }
    }, []);
    return (
        <div className="filters-container">
            <div className="filters-container-body">
                <MdClose className="filters-container-close" onClick={close} />
                <div className='filters-container-input-container'>
                    <input className='filters-container-input'></input>

                </div>
                <MdSearch className="filters-container-search" />
                <div className="filter-files">
                    <list>
                        {
                            recordsItems.map((item, index) => {
                                return <FileRecord
                                    imgSrc={item.img}
                                    title={item.title}
                                    index={index}
                                    isSelected={selectedIndex!==undefined && selectedIndex==index}
                                    select={select} />
                            })
                        }
                    </list>
                </div>
            </div>
        </div>
    )
}

export default connect(
    null,
    { setSubtitle, setFilterItems }
  )(FilterPicker);

