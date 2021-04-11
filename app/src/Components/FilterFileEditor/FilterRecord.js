import React, { useState } from 'react'

export default function FilterRecord({record}) {
    const recordObj =record;
    var fromDates = record.From.split(":");
    var toDates = record.To.split(":");
    const [time, setTime] = useState({
        fh : fromDates[0],
        fm : fromDates[1],
        fs : fromDates[2],
        th : toDates[0],
        tm : toDates[1],
        ts : toDates[2],
    });

    const inputChange = (e) => {
        const newTime = {...time, [e.target.name]:e.target.value};
        setTime({...time, [e.target.name]:e.target.value});
        const from = newTime.fh + ":" + newTime.fm + ":" + newTime.fs;
        const to = newTime.th + ":" + newTime.tm + ":" + newTime.ts;
        record.From = from;
        record.To = to;
    }

    return (
        <tr>
            <td>
                <input onChange={inputChange} className='bk'     name='fh' value={time.fh} />&nbsp;:&nbsp;
                <input onChange={inputChange} className='bk'     name='fm' value={time.fm} />&nbsp;:&nbsp;
                <input onChange={inputChange} className='bkLong' name='fs' value={time.fs} />
            </td>
            <div className='break'></div>
            <td>
                <input onChange={inputChange}  className='bk'     name='fh' value={time.th} />&nbsp;:&nbsp;
                <input onChange={inputChange}  className='bk'     name='fm' value={time.tm} />&nbsp;:&nbsp;
                <input onChange={inputChange}  className='bkLong' name='fs' value={time.ts} />
            </td>
            <td>
                <select name='Type'>
                    {/* {
    for (var key in SceneType) {
        var value = SceneType[key];
        if (typeof (value) == "string") {
                        str += "<option value='" + value + "'";
            if (value == sceneObject.Type) {
                        str += " selected"
                    }
            str += ">" + value + "</option>";
        }
    }
} */}
                </select>
            </td>
            <td>
                <select name='Age'>
                    {/* for (var key in SceneIntensity) {
        var value = SceneIntensity[key];
        if (typeof (value) == "string") {
            str += "<option value='" + value + "'";
            if (value == sceneObject.Age) {
                str += " selected"
            }
            str += ">" + value + "</option>";
        }
    } */}
                </select>
            </td >
        </tr >
    )
}
