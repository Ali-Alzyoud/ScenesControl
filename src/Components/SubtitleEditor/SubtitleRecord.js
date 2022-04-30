import React, { memo, Fragment, useState, useCallback } from 'react'
import { useSelector } from 'react-redux';
import { getSyncConfig } from '../../redux/selectors';

const timeToString = (time) => {
    const hh = String(Math.floor(time / 60 / 60 / 1000)).padStart(2, 0);
    const mm = String(Math.floor(time / 60 / 1000)).padStart(2, 0)%60;
    const ss = String(Math.floor(time / 1000)).padStart(2, 0)%60;
    const ms = String(Math.floor(time % 1000)).padStart(3, 0);

    return hh + ":" + mm + ":" + ss + "." + ms;
}

function SubtitleRecord({ record, dontChange, onCheck }) {
    const [checked, setChecked] = useState(false);
    const onChange = useCallback(
        () => {
            setChecked((prev)=>{
                if (onCheck) {
                    onCheck(record, !prev);
                }
                return !prev;
            })
        },
        [],
    )

    const time = useSelector(state => {
        const delay = getSyncConfig(state).subtitleDelay;
        return delay;
    });
    const slope = useSelector(state => {
        const slope = getSyncConfig(state).subtitleSlope;
        return slope;
    });
    return (
        <tr key={record.from + "_" + time}>
            <td>
                {timeToString(dontChange ? record.from : (record.from * slope + time * 1000))}
            </td>
            <td>
                {timeToString(dontChange ? record.to : (record.to * slope + time * 1000))}
            </td>
            <td>
                <p>
                    {record.content.map((txt, index) => {
                        return <Fragment>
                            {index > 0 && <br />}
                            <span>{txt}</span>
                        </Fragment>
                    })}
                </p>
            </td>
            <td><input type='checkbox' onChange={onChange} checked={checked}></input></td>
        </tr >
    )
}

export default memo(SubtitleRecord);
