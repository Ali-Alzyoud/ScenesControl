import React, { useEffect, useState } from 'react'
import { MdClose, MdSearch } from 'react-icons/md'
import FileRecord from './FileRecord'
import * as API from '../../common/API/API'

import { connect } from "react-redux";
import { setFilterItems, setSubtitle, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime } from '../../redux/actions'
import SrtClass from '../../common/SrtClass'
import { SceneGuideClass } from '../../common/SceneGuide'

import "./style.css"
import Loader from '../Loader';

function FilterPicker({
    close,
    setFilterItems,
    setSubtitle,
    setVideoSrc,
    setVideoName,
    setModalOpen,
    setDuration,
    setTime
}) {
    const [recordsItems, setRecordsItems] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState();
    const [filterText, setFilterText] = useState();
    const select = (index) => {
        setSelectedIndex(index);
        const selectedRecord = recordsItems[index];
        const endPointURL = !selectedRecord.isAbsoluteLink ? API.endpoint + "/" : '';
        SrtClass.ReadFile(endPointURL + selectedRecord.subtitle).then((records) => {
            setSubtitle(records);
        });
        if (selectedRecord.filterSrc) {
            SceneGuideClass.ReadFile(endPointURL + selectedRecord.filterSrc).then((records) => {
                setFilterItems(records);
            });
        }
        else {
            setFilterItems([]);
        }
        if (selectedRecord.video) {
            setVideoSrc(selectedRecord.video);
            const fileName = selectedRecord.video.replace(/^.*[\\\/]/, '') || 'sample';
            setVideoName(fileName);
            setDuration(0);
        }
        close();
    }
    const copy = (index) => {
        const selectedRecord = recordsItems[index];
        const endPointURL = !selectedRecord.isAbsoluteLink ? API.endpoint + "/" : '';
        let str = window.location.origin + '#/'
            + btoa(selectedRecord.video) + '/'
            + btoa(selectedRecord.subtitle ? (endPointURL + selectedRecord.subtitle) : '') + '/'
            + btoa(selectedRecord.filterSrc ? (endPointURL + selectedRecord.filterSrc): '');
        window.location.href = str;
    }
    const textChanged = (e) => {
        setFilterText(e.target.value.toLowerCase());
        e.stopPropagation();
        e.preventDefault();
    }
    useEffect(() => {
        API.getMediaRecords().then((value) => {
            const fileRecords = [];
            setRecordsItems(value.records);
        });
        setModalOpen(true);
        return () => {
            setModalOpen(false);
        }
    }, []);
    return (
        <div className="filters-container">
            <div className="filters-container-body">
                <MdClose className="filters-container-close" onClick={close} />
                <div className='filters-container-input-container'>
                    <input className='filters-container-input' onChange={textChanged}></input>
                </div>
                <MdSearch className="filters-container-search" />
                <div className="filter-files">
                    <list>
                        {
                            recordsItems && recordsItems.length > 0 ?
                                recordsItems.map((item, index) => {
                                    return filterText && !item.title.toLowerCase().includes(filterText) ?
                                        null
                                        :
                                        <FileRecord
                                            imgSrc={item.img}
                                            title={item.title}
                                            link={item.movie}
                                            index={index}
                                            readyToPlay={!!item.video}
                                            isSelected={selectedIndex !== undefined && selectedIndex == index}
                                            select={select}
                                            copy={copy}/>
                                })
                                :
                                <div style={{ width: '100%', position: 'absolute', alignContent: 'center' }}>
                                    <Loader />
                                </div>
                        }
                    </list>
                </div>
            </div>
        </div>
    )
}

export default connect(
    null,
    { setSubtitle, setFilterItems, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime }
)(FilterPicker);

