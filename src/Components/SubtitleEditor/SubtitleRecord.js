import React, { memo, Fragment } from 'react'
import { useSelector } from 'react-redux';
import { getSyncConfig } from '../../redux/selectors';

const timeToString = (time) => {
    const hh = String(Math.floor(time / 60 / 60 / 1000)).padStart(2,0);
    const mm = String(Math.floor(time / 60 / 1000)).padStart(2,0);
    const ss = String(Math.floor(time / 1000)).padStart(2,0);
    const ms = String(Math.floor(time % 1000)).padStart(3,0);

    return hh + ":" + mm + ":" + ss + "." + ms;
}

function SubtitleRecord({record}) {
    const time = useSelector(state => {
        const delay = getSyncConfig(state).subtitleSync;
        return delay;
    })
    return (
        <tr key={record.from + "_" +time}>
            <td>
                {timeToString(record.from + time * 1000)}
            </td>
            <td>
                {timeToString(record.to + time * 1000)}
            </td>
            <td>
                <p>
                {record.content.map((txt, index) => {
                    return <Fragment>
                        {index > 0 && <br/>}
                        <span>{txt}</span>
                         </Fragment>
                })}
                </p>
            </td>
        </tr >
    )
}

export default memo(SubtitleRecord);
