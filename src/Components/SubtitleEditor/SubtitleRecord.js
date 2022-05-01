import React, { memo, Fragment, useState, useCallback } from 'react'
import { useSelector } from 'react-redux';
import SrtClass from '../../common/SrtClass';
import { getSyncConfig } from '../../redux/selectors';

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
                {SrtClass.timeToString(dontChange ? record.from : (record.from * slope + time * 1000))}
            </td>
            <td>
                {SrtClass.timeToString(dontChange ? record.to : (record.to * slope + time * 1000))}
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
