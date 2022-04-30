import React from 'react'
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
            <br /><br />
            <div className='container' onClick={slopeInc}>
                <FaPlus className='middle' />
            </div>
            <span>Slope {syncConfig.subtitleSlope}</span>
            <div className='container' onClick={slopeDec}>
                <FaMinus className='middle' />
            </div>
            <br /><br />
            <div className='table-container'>
                <table style={{ float: hasSyncSubtitleFile ? 'left' : 'unset', marginRight: '20px' }}>
                    <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Content</th>
                    </tr>
                    {
                        subtitle.map((record, index) => {
                            return <SubtitleRecord record={record} />
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
                                return <SubtitleRecord record={record} dontChange={true}/>
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