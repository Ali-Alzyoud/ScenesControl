import React, { useEffect, useState } from 'react'
import { MdClose, MdSearch } from 'react-icons/md'
import FileRecord from './FileRecord'
import * as API from '../../common/API/API'

import { connect } from "react-redux";
import { setFilterItems, setSubtitle, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime } from '../../redux/actions'

import "./style.css"
import SrtClass from '../../common/SrtClass';
import { SceneGuideClass } from '../../common/SceneGuide';

function FilterPicker({
    close,
    setFilterItems,
    setSubtitle,
    setVideoSrc,
    setVideoName,
    setModalOpen,
    setDuration,
    setTime,
    folders,
    path,
}) {
    const [recordsItems, setRecordsItems] = useState([]);
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

    const copy = ({image,video,srt,filter}) => {
        setVideoSrc(video);
        setVideoName(video);
        setSubtitle(srt);
        SrtClass.ReadFile(srt).then((records) => {
            setSubtitle(records);
        });
        SceneGuideClass.ReadFile(filter).then((records) => {
            setFilterItems(records);
        });

        close();
    }
    return (
        <div className="filters-container">
            <div className="filters-container-body">
                <MdClose className="filters-container-close" onClick={close} />
                <div className='filters-container-input-container'>
                    {/* <input className='filters-container-input' onChange={textChanged}></input> */}
                </div>
                <MdSearch className="filters-container-search" />
                <div className="filter-files">
                    <list>
                    {folders.map((item => {
                        let image = item.files.filter(file => file.includes(".jpg")||file.includes(".png"))?.[0]
                        let video = item.files.filter(file => file.includes(".mkv")||file.includes(".mp4"))?.[0]
                        let srt = item.files.filter(file => file.includes(".srt"))?.[0]
                        let filter = item.files.filter(file => file.includes(".txt"))?.[0]
                        image = `${path}/${item.folder}/${image}`;
                        video = `${path}/${item.folder}/${video}`;
                        srt = `${path}/${item.folder}/${srt}`;
                        filter = `${path}/${item.folder}/${filter}`;

                        return  <FileRecord
                        imgSrc={image}
                        title={item.folder}
                        copy={()=>copy({image,video,srt,filter})}
                        />
                    }))}
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

