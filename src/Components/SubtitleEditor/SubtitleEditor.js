import React, { useCallback, useState } from 'react'
import { FaSave, FaPlus, FaMinus } from 'react-icons/fa'
import { connect, useDispatch, useSelector } from "react-redux";
import { setSettings_syncConfig } from '../../redux/actions';
import { getSyncConfig, selectSubtitle, selectSubtitleSync } from '../../redux/selectors';

import './style.css'
import SubtitleRecord from './SubtitleRecord';

function SubtitleEditor(props) {
    const {
        subtitle,
        subtitleSync
    } = props;

    const syncConfig = useSelector(getSyncConfig)
    const dispatch = useDispatch();

    const saveItems = () => {
        // const element = document.createElement("a");
        // const file = new Blob([SceneGuideClass.ToString(records)], { type: 'text/plain' });
        // element.href = URL.createObjectURL(file);
        // element.download = videoName+".txt";
        // document.body.appendChild(element); // Required for this to work in FireFox
        // element.click();
    }

    const sync = () => {
        if(subtitleRecords1.length == 1 && subtitleRecords2.length ==1){
            const recordSrc = subtitleRecords1[0];
            const recordDst = subtitleRecords2[0];
            const time = (recordDst.from - recordSrc.from);
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: time/1000,
                subtitleSlope: 1,
            }));
        } else if(subtitleRecords1.length == 2 && subtitleRecords2.length == 2){
            const recordSrc1From = Math.min(subtitleRecords1[0].from,subtitleRecords1[1].from);
            const recordSrc2From = Math.max(subtitleRecords1[0].from,subtitleRecords1[1].from);
            const recordDst1From = Math.min(subtitleRecords2[0].from,subtitleRecords2[1].from);
            const recordDst2From = Math.max(subtitleRecords2[0].from,subtitleRecords2[1].from);
            const timeDurationSrc = Math.abs(recordSrc1From - recordSrc2From);
            const timeDurationDst = Math.abs(recordDst1From - recordDst2From);
            const slope = timeDurationDst/timeDurationSrc;
            const delay = recordDst1From - slope * recordSrc1From;
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: delay/1000,
                subtitleSlope: slope,
            }));
        } else {
            alert("Select 1 or 2 records to sync them")
        }
    }

    const slopeInc = () => {
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSlope: syncConfig.subtitleSlope + 0.05,
            }
        ))
    }

    const slopeDec = () => {
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSlope: syncConfig.subtitleSlope - 0.01,
            }
        ))
    }

    const delayInc = () => {
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleDelay: syncConfig.subtitleDelay + 0.5,
            }
        ))
    }

    const delayDec = () => {
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleDelay: syncConfig.subtitleDelay - 0.5,
            }
        ))
    }

    const hasSyncSubtitleFile = !!(subtitleSync && subtitleSync.length > 0);
    const [subtitleRecords1, setSubtitleRecords1] = useState([]);
    const [subtitleRecords2, setSubtitleRecords2] = useState([]);

    const onCheckSubtitle1 = useCallback( (record, checked) => {
        if(checked){
            setSubtitleRecords1(prev => [...prev,record])
        } else {
            setSubtitleRecords1(subtitleRecords1.filter((item) => {
                return item.from != record.from
            }));
        }
      },[]);

    const onCheckSubtitle2 = useCallback(
        (record, checked) => {
          if(checked){
            setSubtitleRecords2(prev => [...prev,record])
          } else {
              setSubtitleRecords2(subtitleRecords2.filter((item) => {
                  return item.from != record.from
              }));
          }
        },
        [],
      )

    return (
        <div className='editor-container'>
            <div className='container' onClick={saveItems}>
                <FaSave className='middle' />
            </div>
            <br /><br />
            <div className='container' onClick={delayInc}>
                <FaPlus className='middle' />
            </div>
            <span>Delay {syncConfig.subtitleDelay}</span>
            <div className='container' onClick={delayDec}>
                <FaMinus className='middle' />
            </div>
            <div className='container' onClick={slopeInc}>
                <FaPlus className='middle' />
            </div>
            <span>Slope {syncConfig.subtitleSlope}</span>
            <div className='container' onClick={slopeDec}>
                <FaMinus className='middle' />
            </div>
            <br /><br />
            <div className='container rect' onClick={sync}>
                <span className='middle'>Sync</span>
            </div>
            <div className='table-container'>
                <table style={{ float: hasSyncSubtitleFile ? 'left' : 'unset', marginRight: '20px' }}>
                    <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Content</th>
                    </tr>
                    {
                        subtitle.map((record, index) => {
                            return <SubtitleRecord record={record} onCheck={onCheckSubtitle1}/>
                        })
                    }
                </table>
                {hasSyncSubtitleFile &&
                    <table style={{ float: 'right' }}>
                        <tr>
                            <th>From</th>
                            <th>To</th>
                            <th>Content</th>
                        </tr>
                        {
                            subtitleSync.map((record, index) => {
                                return <SubtitleRecord record={record} dontChange={true} onCheck={onCheckSubtitle2}/>
                            })
                        }
                    </table>}
            </div>
        </div>
    )
}


const mapStateToProps = state => {
    const subtitle = selectSubtitle(state);
    const subtitleSync = selectSubtitleSync(state);
    return { subtitle, subtitleSync };
};

export default connect(mapStateToProps,
    {
    })(SubtitleEditor);