import React, { useEffect, useState } from 'react'
import { MdClose, MdSearch } from 'react-icons/md'
import FileRecord from './FileRecordLocal'
import * as API from '../../common/API/API'

import { connect } from "react-redux";
import { setFilterItems, setSubtitle, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime } from '../../redux/actions'

import "./style.css"
import SrtClass from '../../common/SrtClass';
import { SceneGuideClass } from '../../common/SceneGuide';
import { useAlert } from 'react-alert';
import { useRef } from 'react';

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
    videoPath,
}) {
    const [recordsItems, setRecordsItems] = useState([]);
    const containerRef = useRef()

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

    const copy = ({ image, video, srt, filter }) => {


        let str = window.location.origin + '#/'
            + btoa(encodeURIComponent(video)) + '/'
            + btoa(encodeURIComponent(srt ? (srt) : '')) + '/'
            + btoa(encodeURIComponent(filter ? (filter): ''));
        window.location.href = str;

        setVideoSrc(video);
        setVideoName(video.split("/")?.[video.split("/")?.length - 1]);
        if (srt) {
            SrtClass.ReadFile(srt).then((records) => {
                setSubtitle(records);
            });
        }
        else {
            setSubtitle([]);
        }
        if (filter) {
            SceneGuideClass.ReadFile(filter).then((records) => {
                setFilterItems(records);
            });
        }
        else {
            setFilterItems([]);
        }

        close();
    }

    useEffect(() => {
      if(containerRef.current){
        setTimeout(() => {
            if(containerRef && containerRef.current){
                containerRef.current.focus();
                containerRef.current.tabIndex = 0;
            }
        }, 1000);
      }
    }, [])
    
    const alert = useAlert();

    const [filterText, setFilterText] = useState(localStorage.getItem("filterText"));
    const textChanged = (e) => {
        setFilterText(e.target.value.toLowerCase());
        localStorage.setItem("filterText", e.target.value.toLowerCase())
        e.stopPropagation();
        e.preventDefault();
    }

    return (
        <div className="filters-container">
            <div className="filters-container-body">
                <MdClose className="filters-container-close" onClick={close} />
                <div className='filters-container-input-container'>
                    <input className='filters-container-input' onChange={textChanged} value={filterText}></input>
                </div>
                <div className="filter-files" ref={containerRef} tabIndex={0}>
                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap:'20px' }}>
                        {folders.map(((item, index) => {
                            if (item.files.filter(file => file.endsWith(".mkv") || file.endsWith(".mp4")).length > 1) {
                                let image = item.files.filter(file => file.endsWith(".jpg") || file.endsWith(".png"));
                                let videos = item.files.filter(file => file.endsWith(".mkv") || file.endsWith(".mp4"))
                                let srts = item.files.filter(file => file.endsWith(".srt"));
                                let filters = item.files.filter(file => file.endsWith("mp4.txt") || file.endsWith("mkv.txt"));
                                image = image && `${path}/${item.folder}/${image}`;

                                videos = videos.map((video) => {
                                    return `${videoPath}/${item.folder}/${video}`;
                                })

                                srts = srts.map((srt) => {
                                    return `${path}/${item.folder}/${srt}`;
                                })

                                filters = filters.map((filter) => {
                                    return `${path}/${item.folder}/${filter}`;
                                })

                                return filterText && !item?.folder?.toLowerCase()?.includes(filterText) ?
                                        null
                                        :
                                        <FileRecord
                                    imgSrc={image}
                                    title={item.folder}
                                    copy={() => {
                                        alert.show(<div style={{ display: 'flex', gap:'2px' , flexWrap: 'wrap', flexDirection: 'row', minWidth:'520px'}}>
                                            {
                                                videos.map((video, index) => {
                                                    return <div style={{ 
                                                        width: '60px',
                                                        height: '60px',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        alignSelf:'center',
                                                        borderColor: 'red',
                                                        borderWidth: '1px',
                                                        borderStyle:'double',
                                                        background:'red'
                                                    }} onClick={() => {
                                                        copy({ image, video:videos[index], srt:srts[index], filter:filters[index] })
                                                        alert.removeAll();
                                                    }}>{index + 1}</div>
                                                })
                                            }
                                        </div>);
                                        // copy({ image, video, srt, filter })
                                    }}
                                />

                            } else {
                                let image = item.files.filter(file => file.includes(".jpg") || file.includes(".png"))?.[0]
                                let video = item.files.filter(file => file.includes(".mkv") || file.includes(".mp4"))?.[0]
                                let srt = item.files.filter(file => file.includes(".srt"))?.[0]
                                let filter = item.files.filter(file => file.includes("mp4.txt") || file.includes("mkv.txt"))?.[0];
                                image = image && `${path}/${item.folder}/${image}`;
                                video = video && `${videoPath}/${item.folder}/${video}`;
                                srt = srt && `${path}/${item.folder}/${srt}`;
                                filter = filter && `${path}/${item.folder}/${filter}`;

                                return filterText && !item?.folder?.toLowerCase()?.includes(filterText) ?
                                        null
                                        : <FileRecord
                                    imgSrc={image}
                                    title={item.folder}
                                    filter={!!filter}
                                    copy={() => copy({ image, video, srt, filter })}
                                />
                            }
                        }))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default connect(
    null,
    { setSubtitle, setFilterItems, setModalOpen, setVideoSrc, setVideoName, setDuration, setTime }
)(FilterPicker);

