import React, { useState, useEffect, memo } from 'react'
import { SceneGeometry, SceneIntensity, SceneType } from '../../common/SceneGuide'
import {FaBuilding, FaMinus, FaPen, FaPlusSquare, FaRegPlusSquare, FaSquare} from 'react-icons/fa'
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { setDrawingEnabled, setDrawingRect } from '../../redux/actions';
import { selectDrawingRect } from '../../redux/selectors';

function FilterRecord({record, index, isSelected, removeItem, selectItem, updateItem}) {
    var fromDates = record.From.split(":");
    var toDates = record.To.split(":");
    const dispatch = useDispatch();
    const rect = useSelector(selectDrawingRect, shallowEqual);
    const [state, setState] = useState({
        fh : fromDates[0],
        fm : fromDates[1],
        fs : fromDates[2],
        th : toDates[0],
        tm : toDates[1],
        ts : toDates[2],
        type : record.Type,
        intensity : record.Intensity,
        geometries : record.geometries
    });
    

    useEffect(() => {
      if(rect && isSelected){
        record.geometries.splice(0, record.geometries.length);
        if(rect.w > 0 && rect.h > 0){
            record.geometries.push(new SceneGeometry(rect.x, rect.y, rect.w, rect.h));
        }
        updateItem(record);
        dispatch(setDrawingRect(null));
      }
    }, [rect]);

    const inputChange = (e) => {
        const newState = {...state, [e.target.name]:e.target.value};
        setState(newState);
        const from = newState.fh + ":" + newState.fm + ":" + newState.fs;
        const to = newState.th + ":" + newState.tm + ":" + newState.ts;
        const type = newState.type;
        const intensity = newState.intensity;
        record.From = from;
        record.To = to;
        record.Type = type;
        record.Intensity = intensity;
    }

    const onRemove = () => {
        removeItem(record);
    }

    const onSelect = () => {
        selectItem(record);
    }

    const onBlur = () => {
        updateItem(record);
    }

    const onDrawRect = () => {
        if(isSelected){
            dispatch(setDrawingEnabled(true));
        }
    }

    return (
        <tr>
            <td>
                <input onBlurCapture={onBlur} onChange={inputChange} className='bk'     name='fh' value={state.fh} />&nbsp;:&nbsp;
                <input onBlurCapture={onBlur} onChange={inputChange} className='bk'     name='fm' value={state.fm} />&nbsp;:&nbsp;
                <input onBlurCapture={onBlur} onChange={inputChange} className='bkLong' name='fs' value={state.fs} />
            </td>
            <td>
                <input onBlurCapture={onBlur} onChange={inputChange}  className='bk'     name='th' value={state.th} />&nbsp;:&nbsp;
                <input onBlurCapture={onBlur} onChange={inputChange}  className='bk'     name='tm' value={state.tm} />&nbsp;:&nbsp;
                <input onBlurCapture={onBlur} onChange={inputChange}  className='bkLong' name='ts' value={state.ts} />
            </td>
            <td>
                <select className='selectType' onBlurCapture={onBlur} onChange={inputChange} name='type' value={state.type}>
                        <option value={SceneType.Violence}  selected={record.Type === SceneType.Violence}>{SceneType.Violence}</option>
                        <option value={SceneType.Nudity}    selected={record.Type === SceneType.Nudity}>{SceneType.Nudity}</option>
                        <option value={SceneType.Sex}    selected={record.Type === SceneType.Sex}>{SceneType.Sex}</option>
                        <option value={SceneType.Profanity} selected={record.Type === SceneType.Profanity}>{SceneType.Profanity}</option>
                </select>
            </td>
            <td>
                <select className='selectType' onBlurCapture={onBlur} onChange={inputChange} name='intensity' value={state.intensity}>
                        <option value={SceneIntensity.Low}   selected={record.Intensity === SceneIntensity.Low}>{SceneIntensity.Low}</option>
                        <option value={SceneIntensity.High}  selected={record.Intensity === SceneIntensity.High}>{SceneIntensity.High}</option>
                </select>
            </td >
            <td>
            <div className='container remove' onClick={onRemove} style={{margin:'0 auto'}}>
                <FaMinus className='middle'/>
            </div>
            </td>
            <td>
                <div className='container select' onClick={onDrawRect} style={{ margin: '0 auto' }}>
                    {(record.geometries.length > 0) ? <FaPlusSquare className='middle' /> : <FaRegPlusSquare className='middle' />}
                </div>
            </td>
            <td>
                <div className='container select' onClick={onSelect} style={{ margin: '0 auto' }}>
                    {isSelected ? <FaPen className='middle' /> : <FaSquare className='middle' />}
                </div>
            </td>
        </tr >
    )
}

export default memo(FilterRecord);
